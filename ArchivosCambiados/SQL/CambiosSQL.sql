-- MEJORA DE INVENTARIO
USE datafood;
CREATE TABLE IF NOT EXISTS SupplyDailySnapshot (
    supplyDailySnapshotId INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    snapshotDate           DATE          NOT NULL,
    stockAtClose           DECIMAL(10,3) NOT NULL,
    supply_supplyId        INT           NOT NULL,
    CONSTRAINT FK_SupplyDailySnapshot_Supply
        FOREIGN KEY (supply_supplyId) REFERENCES Supply(supplyId),
    UNIQUE KEY UQ_Supply_Date (supply_supplyId, snapshotDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

USE datafood;
ALTER TABLE StockAdjustment
    ADD COLUMN adjustmentType VARCHAR(20) NOT NULL DEFAULT 'CORRECTION';
    
USE datafood;
ALTER TABLE StockAdjustment
    ADD COLUMN lossAmount DECIMAL(10,2) NULL;
    
 USE datafood;   
ALTER TABLE Supply
    ADD COLUMN averageCost DECIMAL(10,2) NOT NULL DEFAULT 0;
DESCRIBE StockAdjustment;

USE datafood;
ALTER TABLE SupplyProduct
    ADD COLUMN quantity DECIMAL(10,3) NOT NULL DEFAULT 0
        COMMENT 'Cantidad de este insumo usada en la receta del producto';
       
       



-- COSTEO DE RECETAS

USE datafood;
ALTER TABLE Product
    ADD COLUMN lastActivationDate DATE NULL
        COMMENT 'Última fecha en que se activó para vender — evita descontar insumos dos veces el mismo día';

DELIMITER $$

-- ── SP_CreatePurchase ─────────────────────────────────────────
DROP PROCEDURE IF EXISTS SP_CreatePurchase$$
CREATE PROCEDURE SP_CreatePurchase(
    IN p_supplierId    INT,
    IN p_employeeId    INT,
    IN p_paymentMethod VARCHAR(30),
    IN p_invoiceNumber VARCHAR(30),
    IN p_taxRate       DECIMAL(5,2),
    IN p_detailsJson   JSON
)
BEGIN
    DECLARE v_subtotal        DECIMAL(10,2);
    DECLARE v_taxAmount       DECIMAL(10,2);
    DECLARE v_total           DECIMAL(10,2);
    DECLARE v_headerId        INT;
    DECLARE v_headerSuppId    INT;
    DECLARE v_supplierName    VARCHAR(100);
    DECLARE v_supplierCompany VARCHAR(100);

    IF JSON_LENGTH(p_detailsJson) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Debe incluir al menos un insumo en la compra.';
    END IF;

    SELECT IFNULL(SUM(j.quantity * j.unitPrice), 0)
    INTO v_subtotal
    FROM JSON_TABLE(
        p_detailsJson, '$[*]'
        COLUMNS (
            quantity  DECIMAL(10,3) PATH '$.quantity',
            unitPrice DECIMAL(10,2) PATH '$.unitPrice'
        )
    ) j;

    SET p_taxRate   = IFNULL(p_taxRate, 18.00);
    SET v_taxAmount = ROUND(v_subtotal * p_taxRate / 100, 2);
    SET v_total     = v_subtotal + v_taxAmount;

    -- Proveedor del header
    IF p_supplierId = 0 OR p_supplierId IS NULL THEN
        SELECT IFNULL(j.supplierId, NULL)
        INTO v_headerSuppId
        FROM JSON_TABLE(
            p_detailsJson, '$[*]'
            COLUMNS (supplierId INT PATH '$.supplierId')
        ) j
        LIMIT 1;
    ELSE
        SET v_headerSuppId = p_supplierId;
    END IF;

    INSERT INTO PurchaseHeader (
        purchaseDate, paymentMethod, status,
        subtotal, tax, taxRate, total,
        invoiceNumber, supplier_supplierId, employee_employeeId
    )
    VALUES (
        NOW(), IFNULL(p_paymentMethod, 'Efectivo'), 'Recibido',
        v_subtotal, v_taxAmount, p_taxRate, v_total,
        p_invoiceNumber, v_headerSuppId, p_employeeId
    );

    SET v_headerId = LAST_INSERT_ID();

    INSERT INTO PurchaseDetail (
        quantity, unitPrice, subtotal,
        purchaseHeader_id, supply_supplyId, supplier_supplierId
    )
    SELECT
        j.quantity,
        j.unitPrice,
        j.quantity * j.unitPrice,
        v_headerId,
        j.supplyId,
        IFNULL(NULLIF(j.supplierId, 0), NULLIF(p_supplierId, 0))
    FROM JSON_TABLE(
        p_detailsJson, '$[*]'
        COLUMNS (
            supplyId   INT           PATH '$.supplyId',
            quantity   DECIMAL(10,3) PATH '$.quantity',
            unitPrice  DECIMAL(10,2) PATH '$.unitPrice',
            supplierId INT           PATH '$.supplierId'
        )
    ) j;

    -- Recalcular costo promedio ponderado ANTES de actualizar el stock
    UPDATE Supply s
    INNER JOIN (
        SELECT j.supplyId, j.quantity, j.unitPrice
        FROM JSON_TABLE(
            p_detailsJson, '$[*]'
            COLUMNS (
                supplyId  INT           PATH '$.supplyId',
                quantity  DECIMAL(10,3) PATH '$.quantity',
                unitPrice DECIMAL(10,2) PATH '$.unitPrice'
            )
        ) j
    ) d ON d.supplyId = s.supplyId
    SET s.averageCost = (
        (s.availableQuantity * s.averageCost) + (d.quantity * d.unitPrice)
    ) / (s.availableQuantity + d.quantity);

    -- Actualizar stock
    UPDATE Supply s
    INNER JOIN (
        SELECT j.supplyId, j.quantity
        FROM JSON_TABLE(
            p_detailsJson, '$[*]'
            COLUMNS (
                supplyId INT           PATH '$.supplyId',
                quantity DECIMAL(10,3) PATH '$.quantity'
            )
        ) j
    ) d ON d.supplyId = s.supplyId
    SET s.availableQuantity = s.availableQuantity + d.quantity;

    SELECT name, IFNULL(company, '')
    INTO v_supplierName, v_supplierCompany
    FROM Supplier WHERE supplierId = v_headerSuppId;

    INSERT INTO PurchaseInvoice (
        subtotal, taxRate, taxAmount, totalAmount,
        supplierName, supplierCompany, purchaseHeader_id
    )
    VALUES (v_subtotal, p_taxRate, v_taxAmount, v_total,
            v_supplierName, v_supplierCompany, v_headerId);

    INSERT INTO PurchaseChangeLog (action, detail, purchaseHeader_id, employee_employeeId)
    VALUES (
        'Creó la compra',
        CONCAT('Compra registrada. Total: $', v_total, ' · ', JSON_LENGTH(p_detailsJson), ' insumo(s).'),
        v_headerId, p_employeeId
    );

    SELECT v_headerId AS purchaseHeaderId;
END$$

DELIMITER ;




USE datafood;
DROP VIEW IF EXISTS vw_SupplyInventory;

CREATE VIEW vw_SupplyInventory AS
SELECT
    s.supplyId,
    s.name,
    s.availableQuantity,
    s.minimumQuantity,
    s.unitOfMeasure,
    s.stockAlert,
    s.averageCost,
    sc.supplyCategoryId,
    sc.name AS categoryName,
    lp.lastPurchaseDate,
    lp.lastSupplierName,
    lp.lastUnitPrice
FROM Supply s
INNER JOIN SupplyCategory sc
    ON sc.supplyCategoryId = s.supplyCategory_supplyCategoryId
LEFT JOIN (
    SELECT
        pd.supply_supplyId,
        ph.purchaseDate AS lastPurchaseDate,
        IFNULL(sup_item.name, sup_header.name) AS lastSupplierName,
        pd.unitPrice AS lastUnitPrice
    FROM PurchaseDetail pd
    INNER JOIN PurchaseHeader ph
        ON ph.purchaseHeaderId = pd.purchaseHeader_id
    INNER JOIN Supplier sup_header
        ON sup_header.supplierId = ph.supplier_supplierId
    LEFT JOIN Supplier sup_item
        ON sup_item.supplierId = pd.supplier_supplierId
    WHERE ph.status <> 'Anulado'
      AND ph.purchaseDate = (
          SELECT MAX(ph2.purchaseDate)
          FROM PurchaseDetail pd2
          INNER JOIN PurchaseHeader ph2
              ON ph2.purchaseHeaderId = pd2.purchaseHeader_id
          WHERE pd2.supply_supplyId = pd.supply_supplyId
            AND ph2.status <> 'Anulado'
      )
) lp ON lp.supply_supplyId = s.supplyId;







DELIMITER $$

DROP PROCEDURE IF EXISTS SP_CreateSale$$

CREATE PROCEDURE SP_CreateSale(
    IN p_customerName VARCHAR(100),
    IN p_address      VARCHAR(255),
    IN p_deliveryFee  DECIMAL(10,2),
    IN p_isDelivery   TINYINT(1),
    IN p_employeeId   INT,
    IN p_detailsJson  JSON
)
BEGIN
    DECLARE v_subtotal  DECIMAL(10,2);
    DECLARE v_newSaleId INT;

    SELECT IFNULL(SUM(j.quantity * j.unitPrice), 0)
    INTO v_subtotal
    FROM JSON_TABLE(
        p_detailsJson, '$[*]'
        COLUMNS (
            quantity  DECIMAL(10,2) PATH '$.quantity',
            unitPrice DECIMAL(10,2) PATH '$.unitPrice'
        )
    ) j;

    INSERT INTO SaleHeader (
        total, saleDate, saleType, clientName,
        employee_employeeId, address, deliveryFee, isDelivery, status
    )
    VALUES (
        v_subtotal + IFNULL(p_deliveryFee, 0),
        NOW(),
        CASE WHEN p_isDelivery = 1 THEN 'Domicilio' ELSE 'Local' END,
        p_customerName,
        p_employeeId,
        p_address,
        IFNULL(p_deliveryFee, 0),
        p_isDelivery,
        'Completado'
    );

    SET v_newSaleId = LAST_INSERT_ID();

    -- Generar saleNumber e invoiceNumber aquí (ya no en el trigger)
    UPDATE SaleHeader
    SET
        saleNumber    = CONCAT('V-', LPAD(v_newSaleId, 6, '0')),
        invoiceNumber = CONCAT('VTA-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(v_newSaleId, 6, '0'))
    WHERE saleHeaderId = v_newSaleId;

    INSERT INTO SaleDetail (quantity, subtotal, historicalPrice, sale_saleId, product_productId)
    SELECT
        j.quantity,
        j.quantity * j.unitPrice,
        j.unitPrice,
        v_newSaleId,
        j.productId
    FROM JSON_TABLE(
        p_detailsJson, '$[*]'
        COLUMNS (
            productId INT           PATH '$.productId',
            quantity  DECIMAL(10,2) PATH '$.quantity',
            unitPrice DECIMAL(10,2) PATH '$.unitPrice'
        )
    ) j;

    SELECT v_newSaleId AS saleHeaderId;
END$$

DELIMITER ;

