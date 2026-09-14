-- ============================================================
-- DATAFOOD — Tablas base
-- ============================================================
create database DATAFOOD;
use DATAFOOD;
-- ── Supplier ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Supplier (
    supplierId  INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(45) NOT NULL,
    status      TINYINT     NOT NULL DEFAULT 1,
    company     VARCHAR(45) NOT NULL,
    description VARCHAR(45) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SupplierPhone ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS SupplierPhone (
    supplierPhoneId     INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    phone               VARCHAR(45) NOT NULL,
    supplier_supplierId INT         NOT NULL,
    CONSTRAINT FK_SupplierPhone_Supplier
        FOREIGN KEY (supplier_supplierId) REFERENCES Supplier(supplierId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SupplierAddress ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS SupplierAddress (
    supplierAddressId   INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    address             VARCHAR(45) NOT NULL,
    supplier_supplierId INT         NOT NULL,
    CONSTRAINT FK_SupplierAddress_Supplier
        FOREIGN KEY (supplier_supplierId) REFERENCES Supplier(supplierId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SupplyCategory ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS SupplyCategory (
    supplyCategoryId INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Supply (Insumo) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Supply (
    supplyId                        INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    availableQuantity               INT         NOT NULL CHECK (availableQuantity >= 0),
    minimumQuantity                 INT         NOT NULL CHECK (minimumQuantity >= 0),
    name                            VARCHAR(45) NOT NULL,
    unitOfMeasure                   VARCHAR(45) NOT NULL,
    stockAlert                      TINYINT(1)  NOT NULL DEFAULT 0,
    supplyCategory_supplyCategoryId INT         NOT NULL,
    CONSTRAINT FK_Supply_SupplyCategory
        FOREIGN KEY (supplyCategory_supplyCategoryId) REFERENCES SupplyCategory(supplyCategoryId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Purchase (tabla legacy) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS Purchase (
    purchaseId          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quantity            INT           NOT NULL CHECK (quantity > 0),
    price               DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    purchaseDate        DATETIME      NOT NULL DEFAULT NOW(),
    total               DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    supply_supplyId     INT           NOT NULL,
    supplier_supplierId INT           NOT NULL,
    CONSTRAINT FK_Purchase_Supply   FOREIGN KEY (supply_supplyId)     REFERENCES Supply(supplyId),
    CONSTRAINT FK_Purchase_Supplier FOREIGN KEY (supplier_supplierId) REFERENCES Supplier(supplierId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ProductCategory ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ProductCategory (
    productCategoryId INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Product ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Product (
    productId                         INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name                              VARCHAR(45)   NOT NULL,
    price                             DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    status                            TINYINT       NOT NULL DEFAULT 1,
    imageUrl                          VARCHAR(255)  NULL,
    description                       VARCHAR(255)  NULL,
    productCategory_productCategoryId INT           NOT NULL,
    CONSTRAINT FK_Product_ProductCategory
        FOREIGN KEY (productCategory_productCategoryId) REFERENCES ProductCategory(productCategoryId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SupplyProduct (N:M) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS SupplyProduct (
    supply_supplyId   INT NOT NULL,
    product_productId INT NOT NULL,
    PRIMARY KEY (supply_supplyId, product_productId),
    CONSTRAINT FK_SupplyProduct_Supply  FOREIGN KEY (supply_supplyId)   REFERENCES Supply(supplyId),
    CONSTRAINT FK_SupplyProduct_Product FOREIGN KEY (product_productId) REFERENCES Product(productId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Position (Cargo) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `Position` (
    positionId   INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    positionName VARCHAR(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Employee ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Employee (
    employeeId          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    firstName           VARCHAR(45)   NOT NULL,
    lastName            VARCHAR(45)   NOT NULL,
    password            VARCHAR(255)  NULL,
    status              TINYINT       NOT NULL DEFAULT 1,
    salary              DECIMAL(10,2) NOT NULL CHECK (salary >= 0),
    nationalId          VARCHAR(45)   NOT NULL UNIQUE,
    email               VARCHAR(45)   NOT NULL UNIQUE,
    phone               VARCHAR(20)   NOT NULL DEFAULT '0000-0000',
    hireDate            DATE          NOT NULL DEFAULT (CURRENT_DATE),
    inactiveDate        DATETIME      NULL,
    reactivationDate    DATETIME      NULL,
    inactiveReason      VARCHAR(255)  NULL,
    reset_token         VARCHAR(255)  NULL,
    reset_token_expiry  DATETIME      NULL,
    position_positionId INT           NOT NULL,
    CONSTRAINT FK_Employee_Position
        FOREIGN KEY (position_positionId) REFERENCES `Position`(positionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Permission ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Permission (
    permissionId INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    description  VARCHAR(45) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── PositionPermission (N:M) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS PositionPermission (
    permission_permissionId INT NOT NULL,
    position_positionId     INT NOT NULL,
    PRIMARY KEY (permission_permissionId, position_positionId),
    CONSTRAINT FK_PositionPermission_Permission FOREIGN KEY (permission_permissionId) REFERENCES Permission(permissionId),
    CONSTRAINT FK_PositionPermission_Position   FOREIGN KEY (position_positionId)     REFERENCES `Position`(positionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SaleHeader ────────────────────────────────────────────────
-- NOTA: saleNumber e invoiceNumber ya no son columnas GENERATED,
--       se llenan automáticamente con el trigger de abajo.
CREATE TABLE IF NOT EXISTS SaleHeader (
    saleHeaderId        INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    total               DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    saleDate            DATETIME      NOT NULL DEFAULT NOW(),
    saleType            VARCHAR(45)   NOT NULL,
    clientName          VARCHAR(45)   NULL,
    address             VARCHAR(255)  NULL,
    deliveryFee         DECIMAL(10,2) NOT NULL DEFAULT 0,
    isDelivery          TINYINT(1)    NOT NULL DEFAULT 0,
    status              VARCHAR(20)   NOT NULL DEFAULT 'Completado',
    employee_employeeId INT           NOT NULL,
    saleNumber          VARCHAR(9)    NULL,
    invoiceNumber       VARCHAR(30)   NULL,
    CONSTRAINT FK_SaleHeader_Employee
        FOREIGN KEY (employee_employeeId) REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Trigger: genera saleNumber e invoiceNumber tras cada INSERT ──
DELIMITER $$
CREATE TRIGGER trg_SaleHeader_after_insert
AFTER INSERT ON SaleHeader
FOR EACH ROW
BEGIN
    UPDATE SaleHeader
    SET
        saleNumber    = CONCAT('V-', LPAD(NEW.saleHeaderId, 6, '0')),
        invoiceNumber = CONCAT('VTA-', DATE_FORMAT(NEW.saleDate, '%Y%m%d'), '-', LPAD(NEW.saleHeaderId, 6, '0'))
    WHERE saleHeaderId = NEW.saleHeaderId;
END$$
DELIMITER ;

-- ── SaleDetail ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS SaleDetail (
    saleDetailId      INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quantity          DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    subtotal          DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    historicalPrice   DECIMAL(10,2) NOT NULL CHECK (historicalPrice >= 0),
    sale_saleId       INT           NOT NULL,
    product_productId INT           NOT NULL,
    CONSTRAINT FK_SaleDetail_SaleHeader FOREIGN KEY (sale_saleId)       REFERENCES SaleHeader(saleHeaderId),
    CONSTRAINT FK_SaleDetail_Product    FOREIGN KEY (product_productId) REFERENCES Product(productId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Report ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Report (
    reportId            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    reportDate          DATETIME      NOT NULL DEFAULT NOW(),
    openingAmount       DECIMAL(10,2) NOT NULL CHECK (openingAmount >= 0),
    closingAmount       DECIMAL(10,2) NOT NULL CHECK (closingAmount >= 0),
    cashDifference      DECIMAL(10,2) NOT NULL,
    employee_employeeId INT           NOT NULL,
    CONSTRAINT FK_Report_Employee
        FOREIGN KEY (employee_employeeId) REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── CashRegister ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS CashRegister (
    cashRegisterId  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employeeId      INT           NOT NULL,
    openTime        DATETIME      NOT NULL DEFAULT NOW(),
    closeTime       DATETIME      NULL,
    openingAmount   DECIMAL(10,2) NOT NULL DEFAULT 0,
    closingAmount   DECIMAL(10,2) NULL,
    difference      DECIMAL(10,2) NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'Abierta',
    openNote        VARCHAR(500)  NULL,
    closeNote       VARCHAR(500)  NULL,
    closeEmployeeId INT           NULL,
    CONSTRAINT FK_CashRegister_Employee
        FOREIGN KEY (employeeId) REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── CashMovement ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS CashMovement (
    movementId     INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cashRegisterId INT           NOT NULL,
    employeeId     INT           NOT NULL,
    movementType   VARCHAR(10)   NOT NULL,
    amount         DECIMAL(10,2) NOT NULL,
    reason         VARCHAR(100)  NULL,
    note           VARCHAR(500)  NULL,
    movementDate   DATETIME      NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_CashMovement_CashRegister FOREIGN KEY (cashRegisterId) REFERENCES CashRegister(cashRegisterId),
    CONSTRAINT FK_CashMovement_Employee     FOREIGN KEY (employeeId)     REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Datos iniciales ───────────────────────────────────────────
INSERT IGNORE INTO `Position` (positionName) VALUES
    ('Administrador'),
    ('Cajero'),
    ('Cocinero'),
    ('Motociclista');
    
    -- 1. Cambiamos el delimitador a $$
DELIMITER $$

-- 2. Eliminamos el procedimiento si ya existe usando el nuevo delimitador
DROP PROCEDURE IF EXISTS SP_Login$$

-- 3. Creamos el procedimiento normalmente
CREATE PROCEDURE SP_Login(
    IN p_email    VARCHAR(100),
    IN p_password VARCHAR(255)
)
BEGIN
    SELECT
        e.employeeId,
        e.firstName,
        e.lastName,
        e.email,
        p.positionName AS role
    FROM Employee e
    JOIN `Position` p ON p.positionId = e.position_positionId
    WHERE e.email    = p_email
      AND e.password = p_password
      AND e.status   = 1
      AND p.positionName IN ('Administrador', 'Cajero')
    LIMIT 1;
END$$ -- Aquí termina el bloque del procedimiento

-- 4. Regresamos el delimitador al punto y coma estándar (;)
DELIMITER ;


CREATE TABLE IF NOT EXISTS business_config (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    logo_url VARCHAR(500) NULL,
    phone VARCHAR(20) NULL,
    menu_logo_url VARCHAR(255) NULL
)  ENGINE=INNODB DEFAULT CHARSET=UTF8MB4;





-- ── CashRegister ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS CashRegister (
    cashRegisterId  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employeeId      INT           NOT NULL,
    openTime        DATETIME      NOT NULL DEFAULT NOW(),
    closeTime       DATETIME      NULL,
    openingAmount   DECIMAL(10,2) NOT NULL DEFAULT 0,
    closingAmount   DECIMAL(10,2) NULL,
    difference      DECIMAL(10,2) NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'Abierta',  -- 'Abierta' | 'Cerrado'
    openNote        VARCHAR(500)  NULL,
    closeNote       VARCHAR(500)  NULL,
    closeEmployeeId INT           NULL,
    CONSTRAINT FK_CashRegister_Employee
        FOREIGN KEY (employeeId) REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── CashMovement ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS CashMovement (
    movementId     INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cashRegisterId INT           NOT NULL,
    employeeId     INT           NOT NULL,
    movementType   VARCHAR(10)   NOT NULL,  -- 'Retiro' | 'Deposito'
    amount         DECIMAL(10,2) NOT NULL,
    reason         VARCHAR(100)  NULL,
    note           VARCHAR(500)  NULL,
    movementDate   DATETIME      NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_CashMovement_CashRegister FOREIGN KEY (cashRegisterId) REFERENCES CashRegister(cashRegisterId),
    CONSTRAINT FK_CashMovement_Employee     FOREIGN KEY (employeeId)     REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DELIMITER $$

-- ── SP_OpenCashRegister ───────────────────────────────────────
DROP PROCEDURE IF EXISTS SP_OpenCashRegister$$
CREATE PROCEDURE SP_OpenCashRegister(
    IN p_employeeId    INT,
    IN p_openingAmount DECIMAL(10,2),
    IN p_openNote      VARCHAR(500)
)
BEGIN
    DECLARE v_newId INT;

    IF EXISTS (SELECT 1 FROM CashRegister WHERE status = 'Abierta') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ya existe una caja abierta.';
    END IF;

    INSERT INTO CashRegister (employeeId, openingAmount, openNote, status, openTime)
    VALUES (p_employeeId, IFNULL(p_openingAmount, 0), p_openNote, 'Abierta', NOW());

    SET v_newId = LAST_INSERT_ID();
    SELECT v_newId AS cashRegisterId;
END$$


-- ── SP_CloseCashRegister ──────────────────────────────────────
DROP PROCEDURE IF EXISTS SP_CloseCashRegister$$
DELIMITER $$

CREATE PROCEDURE SP_CloseCashRegister(
    IN p_cashRegisterId INT,
    IN p_closingAmount  DECIMAL(10,2),
    IN p_closeNote      VARCHAR(500),
    IN p_employeeId     INT
)
BEGIN
    DECLARE v_openingAmount DECIMAL(10,2);

    IF NOT EXISTS (
        SELECT 1 FROM CashRegister
        WHERE cashRegisterId = p_cashRegisterId AND status = 'Abierta'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se encontró una caja abierta con ese ID.';
    END IF;

    SELECT openingAmount INTO v_openingAmount
    FROM CashRegister WHERE cashRegisterId = p_cashRegisterId;

    UPDATE CashRegister
    SET
        closeTime       = NOW(),
        closingAmount   = p_closingAmount,
        difference      = p_closingAmount - v_openingAmount,
        closeNote       = p_closeNote,
        status          = 'Cerrado',
        closeEmployeeId = p_employeeId
    WHERE cashRegisterId = p_cashRegisterId;

    SELECT p_cashRegisterId AS cashRegisterId;
END$$

DELIMITER ;

-- ── SP_GetActiveCashRegister ──────────────────────────────────
DROP PROCEDURE IF EXISTS SP_GetActiveCashRegister$$;
DELIMITER $$
CREATE PROCEDURE SP_GetActiveCashRegister(
    IN p_employeeId INT   -- NULL para buscar cualquier caja abierta
)
BEGIN
    SELECT
        cr.cashRegisterId,
        cr.employeeId,
        cr.openTime,
        cr.openingAmount,
        cr.openNote,
        cr.status,
        CONCAT(e.firstName, ' ', e.lastName) AS employeeName
    FROM CashRegister cr
    JOIN Employee e ON e.employeeId = cr.employeeId
    WHERE cr.status = 'Abierta'
      AND (p_employeeId IS NULL OR cr.employeeId = p_employeeId)
    ORDER BY cr.openTime DESC
    LIMIT 1;
END$$
DELIMITER ;

-- ── SP_CreateCashMovement ─────────────────────────────────────
DROP PROCEDURE IF EXISTS SP_CreateCashMovement$$;
DELIMITER $$
CREATE PROCEDURE SP_CreateCashMovement(
    IN p_cashRegisterId INT,
    IN p_employeeId     INT,
    IN p_movementType   VARCHAR(10),
    IN p_amount         DECIMAL(10,2),
    IN p_reason         VARCHAR(100),
    IN p_note           VARCHAR(500)
)
BEGIN
    DECLARE v_newId INT;

    IF NOT EXISTS (
        SELECT 1 FROM CashRegister
        WHERE cashRegisterId = p_cashRegisterId AND status = 'Abierta'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No hay una caja abierta para registrar el movimiento.';
    END IF;

    IF p_movementType NOT IN ('Retiro', 'Deposito') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Tipo de movimiento inválido. Use Retiro o Deposito.';
    END IF;

    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El monto debe ser mayor a cero.';
    END IF;

    INSERT INTO CashMovement (cashRegisterId, employeeId, movementType, amount, reason, note, movementDate)
    VALUES (p_cashRegisterId, p_employeeId, p_movementType, p_amount, p_reason, p_note, NOW());

    SET v_newId = LAST_INSERT_ID();
    SELECT v_newId AS movementId;
END$$
DELIMITER ;

-- ── SP_GetCashBalance ─────────────────────────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS SP_GetCashBalance$$

CREATE PROCEDURE SP_GetCashBalance()
BEGIN
    DECLARE v_totalCierres  DECIMAL(10,2) DEFAULT 0;
    DECLARE v_cashRegId     INT           DEFAULT NULL;
    DECLARE v_openTime      DATETIME      DEFAULT NULL;
    DECLARE v_openingAmount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_ventas        DECIMAL(10,2) DEFAULT 0;
    DECLARE v_movimientos   DECIMAL(10,2) DEFAULT 0;
    DECLARE v_saldoTotal    DECIMAL(10,2) DEFAULT 0;

    -- 1. Suma de todos los cierres históricos
    SELECT IFNULL(SUM(closingAmount), 0)
    INTO v_totalCierres
    FROM CashRegister
    WHERE status IN ('Cerrado', 'Cerrada');

    -- 2. Caja activa actual
    SELECT cashRegisterId, openTime, IFNULL(openingAmount, 0)
    INTO v_cashRegId, v_openTime, v_openingAmount
    FROM CashRegister
    WHERE status = 'Abierta'
    ORDER BY openTime DESC
    LIMIT 1;

    -- 3. Ventas completadas desde que abrió la caja activa
    IF v_openTime IS NOT NULL THEN
        SELECT IFNULL(SUM(CASE WHEN status = 'Completado' THEN total ELSE 0 END), 0)
        INTO v_ventas
        FROM SaleHeader
        WHERE saleDate >= v_openTime;
    END IF;

    -- 4. Movimientos (depósitos suman, retiros restan) de la sesión activa
    IF v_cashRegId IS NOT NULL THEN
        SELECT IFNULL(SUM(
            CASE WHEN movementType = 'Deposito' THEN  amount
                 WHEN movementType = 'Retiro'   THEN -amount
                 ELSE 0 END
        ), 0)
        INTO v_movimientos
        FROM CashMovement
        WHERE cashRegisterId = v_cashRegId;
    END IF;

    SET v_saldoTotal = v_totalCierres + v_openingAmount + v_ventas + v_movimientos;

    SELECT
        v_totalCierres  AS totalCierres,
        v_openingAmount AS openingAmount,
        v_ventas        AS ventasActivas,
        v_movimientos   AS movimientos,
        v_saldoTotal    AS saldoTotal;
END$$
DELIMITER ;


-- ── SP_GetCashMovements ───────────────────────────────────────
Delimiter $$
DROP PROCEDURE IF EXISTS SP_GetCashMovements$$
CREATE PROCEDURE SP_GetCashMovements(
    IN p_limit INT
)
BEGIN
    SET p_limit = IFNULL(p_limit, 50);
    SET @sql = CONCAT(
        'SELECT cm.movementId, cm.movementType, cm.amount, cm.reason, cm.note,
                cm.movementDate,
                CONCAT(e.firstName, '' '', e.lastName) AS employeeName,
                cr.cashRegisterId
         FROM CashMovement cm
         JOIN Employee     e  ON e.employeeId      = cm.employeeId
         JOIN CashRegister cr ON cr.cashRegisterId = cm.cashRegisterId
         ORDER BY cm.movementDate DESC
         LIMIT ', p_limit
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;



-- ============================================================
-- DATAFOOD — Ventas: log y stored procedures
-- Equivalente a: HISTORIAL_DE_VENTAS_ORDENADOI.sql
-- NOTA: El ALTER TABLE fue eliminado porque las columnas
--       address, deliveryFee, isDelivery y status ya están
--       definidas en 01_DataFood_TABLES_LIMPIO.sql
-- ============================================================



-- Sincronizar isDelivery con saleType si ya existen datos
UPDATE SaleHeader SET isDelivery = CASE WHEN saleType = 'Domicilio' THEN 1 ELSE 0 END WHERE saleHeaderId > 0;

-- ── SaleChangeLog ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS SaleChangeLog (
    logId               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    logDate             DATETIME     NOT NULL DEFAULT NOW(),
    action              VARCHAR(50)  NOT NULL,
    detail              VARCHAR(500) NOT NULL,
    saleHeader_id       INT          NOT NULL,
    employee_employeeId INT          NOT NULL,
    CONSTRAINT FK_SaleChangeLog_SaleHeader FOREIGN KEY (saleHeader_id)       REFERENCES SaleHeader(saleHeaderId),
    CONSTRAINT FK_SaleChangeLog_Employee   FOREIGN KEY (employee_employeeId) REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- ── SP_CreateSale ─────────────────────────────────────────────
use datafood;

DROP PROCEDURE IF EXISTS SP_CreateSale;
DELIMITER $$
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

-- ── SP_UpdateSale ─────────────────────────────────────────────
DROP PROCEDURE IF EXISTS SP_UpdateSale$$;
DELIMITER $$
CREATE PROCEDURE SP_UpdateSale(
    IN p_saleId       INT,
    IN p_employeeId   INT,
    IN p_customerName VARCHAR(100),
    IN p_address      VARCHAR(255),
    IN p_detailsJson  JSON
)
BEGIN
    DECLARE v_fee           DECIMAL(10,2);
    DECLARE v_nuevoSubtotal DECIMAL(10,2);

    IF NOT EXISTS (SELECT 1 FROM SaleHeader WHERE saleHeaderId = p_saleId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta no existe.';
    END IF;

    IF EXISTS (SELECT 1 FROM SaleHeader WHERE saleHeaderId = p_saleId AND status = 'Anulado') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede editar una venta anulada.';
    END IF;

    UPDATE SaleHeader
    SET
        clientName = IFNULL(NULLIF(p_customerName, ''), clientName),
        address    = IFNULL(NULLIF(p_address, ''), address)
    WHERE saleHeaderId = p_saleId;

    IF p_detailsJson IS NOT NULL AND JSON_LENGTH(p_detailsJson) > 0 THEN
        UPDATE SaleDetail sd
        INNER JOIN (
            SELECT
                j.productId,
                j.quantity,
                j.unitPrice,
                j.quantity * j.unitPrice AS newSubtotal
            FROM JSON_TABLE(
                p_detailsJson, '$[*]'
                COLUMNS (
                    productId INT           PATH '$.productId',
                    quantity  DECIMAL(10,2) PATH '$.quantity',
                    unitPrice DECIMAL(10,2) PATH '$.unitPrice'
                )
            ) j
        ) jt ON jt.productId = sd.product_productId
        SET
            sd.quantity        = jt.quantity,
            sd.historicalPrice = jt.unitPrice,
            sd.subtotal        = jt.newSubtotal
        WHERE sd.sale_saleId = p_saleId;

        SELECT IFNULL(deliveryFee, 0) INTO v_fee
        FROM SaleHeader WHERE saleHeaderId = p_saleId;

        SELECT IFNULL(SUM(subtotal), 0) INTO v_nuevoSubtotal
        FROM SaleDetail WHERE sale_saleId = p_saleId;

        UPDATE SaleHeader
        SET total = v_nuevoSubtotal + v_fee
        WHERE saleHeaderId = p_saleId;
    END IF;

    SELECT p_saleId AS saleHeaderId;
END$$
DELIMITER ;


-- ── SP_CancelSale ─────────────────────────────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS SP_CancelSale$$
CREATE PROCEDURE SP_CancelSale(
    IN p_saleId     INT,
    IN p_employeeId INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM SaleHeader WHERE saleHeaderId = p_saleId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta no existe.';
    END IF;

    IF EXISTS (SELECT 1 FROM SaleHeader WHERE saleHeaderId = p_saleId AND status = 'Anulado') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta ya está anulada.';
    END IF;


    UPDATE SaleHeader
    SET status = 'Anulado'
    WHERE saleHeaderId = p_saleId;
END$$

DELIMITER ;

-- ============================================================
-- DATAFOOD — Insumos: tablas, triggers, vista y stored procedures
-- Equivalente a: INSUMOS_ORDENADO.sql
-- CORRECCIÓN: purchaseNumber (PurchaseHeader) e invoiceNumber
--   (PurchaseInvoice) no pueden ser GENERATED ALWAYS AS porque
--   referencian columnas AUTO_INCREMENT (Error 3109).
--   Se convirtieron a columnas NULL y se llenan con triggers
--   AFTER INSERT, igual que saleNumber/invoiceNumber en SaleHeader.
-- ============================================================



-- ── PurchaseHeader ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PurchaseHeader (
    purchaseHeaderId    INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    purchaseDate        DATETIME      NOT NULL DEFAULT NOW(),
    paymentMethod       VARCHAR(30)   NOT NULL DEFAULT 'Efectivo',
    status              VARCHAR(20)   NOT NULL DEFAULT 'Recibido',
    subtotal            DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax                 DECIMAL(10,2) NOT NULL DEFAULT 0,
    taxRate             DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
    total               DECIMAL(10,2) NOT NULL DEFAULT 0,
    invoiceNumber       VARCHAR(30)   NULL,
    notes               VARCHAR(200)  NULL,
    supplier_supplierId INT           NOT NULL,
    employee_employeeId INT           NOT NULL,
    purchaseNumber      VARCHAR(10)   NULL,
    CONSTRAINT FK_PurchaseHeader_Supplier FOREIGN KEY (supplier_supplierId) REFERENCES Supplier(supplierId),
    CONSTRAINT FK_PurchaseHeader_Employee FOREIGN KEY (employee_employeeId) REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── PurchaseDetail ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PurchaseDetail (
    purchaseDetailId    INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quantity            DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unitPrice           DECIMAL(10,2) NOT NULL CHECK (unitPrice >= 0),
    subtotal            DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    purchaseHeader_id   INT           NOT NULL,
    supply_supplyId     INT           NOT NULL,
    supplier_supplierId INT           NULL,
    CONSTRAINT FK_PurchaseDetail_Header   FOREIGN KEY (purchaseHeader_id)   REFERENCES PurchaseHeader(purchaseHeaderId),
    CONSTRAINT FK_PurchaseDetail_Supply   FOREIGN KEY (supply_supplyId)     REFERENCES Supply(supplyId),
    CONSTRAINT FK_PurchaseDetail_Supplier FOREIGN KEY (supplier_supplierId) REFERENCES Supplier(supplierId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── PurchaseChangeLog ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PurchaseChangeLog (
    logId               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    logDate             DATETIME     NOT NULL DEFAULT NOW(),
    action              VARCHAR(50)  NOT NULL,
    detail              VARCHAR(500) NOT NULL,
    purchaseHeader_id   INT          NOT NULL,
    employee_employeeId INT          NOT NULL,
    CONSTRAINT FK_ChangeLog_Header   FOREIGN KEY (purchaseHeader_id)   REFERENCES PurchaseHeader(purchaseHeaderId),
    CONSTRAINT FK_ChangeLog_Employee FOREIGN KEY (employee_employeeId) REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── PurchaseInvoice ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PurchaseInvoice (
    invoiceId         INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    generatedAt       DATETIME      NOT NULL DEFAULT NOW(),
    subtotal          DECIMAL(10,2) NOT NULL,
    taxRate           DECIMAL(5,2)  NOT NULL DEFAULT 18.00,
    taxAmount         DECIMAL(10,2) NOT NULL,
    totalAmount       DECIMAL(10,2) NOT NULL,
    supplierName      VARCHAR(100)  NOT NULL,
    supplierCompany   VARCHAR(100)  NOT NULL,
    purchaseHeader_id INT           NOT NULL UNIQUE,
    invoiceNumber     VARCHAR(12)   NULL,
    CONSTRAINT FK_Invoice_Header
        FOREIGN KEY (purchaseHeader_id) REFERENCES PurchaseHeader(purchaseHeaderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── StockAdjustment ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS StockAdjustment (
    adjustmentId        INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    adjustmentDate      DATETIME      NOT NULL DEFAULT NOW(),
    quantityDecreased   DECIMAL(10,3) NOT NULL CHECK (quantityDecreased > 0),
    reason              VARCHAR(200)  NOT NULL DEFAULT 'Ajuste manual',
    supply_supplyId     INT           NOT NULL,
    employee_employeeId INT           NOT NULL,
    CONSTRAINT FK_StockAdj_Supply   FOREIGN KEY (supply_supplyId)     REFERENCES Supply(supplyId),
    CONSTRAINT FK_StockAdj_Employee FOREIGN KEY (employee_employeeId) REFERENCES Employee(employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ── ----------------------------Triggers ──────────────────────────────────────────────────
DELIMITER $$
-- --------------------------trg_PurchaseHeader_after_insert$$-------------
-- Genera purchaseNumber tras cada INSERT en PurchaseHeader
DROP TRIGGER IF EXISTS trg_PurchaseHeader_after_insert$$
CREATE TRIGGER trg_PurchaseHeader_after_insert
AFTER INSERT ON PurchaseHeader
FOR EACH ROW
BEGIN
    UPDATE PurchaseHeader
    SET purchaseNumber = CONCAT('C-', LPAD(NEW.purchaseHeaderId, 6, '0'))
    WHERE purchaseHeaderId = NEW.purchaseHeaderId;
END$$



-- -------------------trg_PurchaseInvoice_after_insert$$---------------------------------------------------------
-- Genera invoiceNumber tras cada INSERT en PurchaseInvoice
DROP TRIGGER IF EXISTS trg_PurchaseInvoice_after_insert$$
DELIMITER $$
CREATE TRIGGER trg_PurchaseInvoice_after_insert
AFTER INSERT ON PurchaseInvoice
FOR EACH ROW
BEGIN
    UPDATE PurchaseInvoice
    SET invoiceNumber = CONCAT('F-', LPAD(NEW.invoiceId, 7, '0'))
    WHERE invoiceId = NEW.invoiceId;
END$$
DELIMITER ;



-- ------------------------------------trg_PreventNegativeStock----------------------------------
-- Evitar stock negativo
DROP TRIGGER IF EXISTS trg_PreventNegativeStock$$
DELIMITER $$
CREATE TRIGGER trg_PreventNegativeStock
BEFORE UPDATE ON Supply
FOR EACH ROW
BEGIN
    IF NEW.availableQuantity < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El stock no puede quedar negativo.';
    END IF;
END$$
DELIMITER ;


-- -----------------------------trg_CheckStockAlert-----------------------
-- Alerta de stock bajo
DROP TRIGGER IF EXISTS trg_CheckStockAlert$$
DELIMITER $$
CREATE TRIGGER trg_CheckStockAlert
BEFORE UPDATE ON Supply
FOR EACH ROW
BEGIN
    IF NEW.availableQuantity <= NEW.minimumQuantity THEN
        SET NEW.stockAlert = 1;
    ELSE
        SET NEW.stockAlert = 0;
    END IF;
END$$
DELIMITER ;


-- --------------------------------------------------------------------------- VISTAS-------------------------------
-- ---------------------------------------------vw_SupplyInventory
-- ── Vista: vw_SupplyInventory ─────────────────────────────────
DROP VIEW IF EXISTS vw_SupplyInventory;

CREATE VIEW vw_SupplyInventory AS
SELECT
    s.supplyId,
    s.name,
    s.availableQuantity,
    s.minimumQuantity,
    s.unitOfMeasure,
    s.stockAlert,
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


-- ──  ----------------------------------                           Stored Procedures ─────────────────────────────────────────
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

-- ── SP_UpdatePurchase ─────────────────────────────────────────
DROP PROCEDURE IF EXISTS SP_UpdatePurchase$$
DELIMITER $$
CREATE PROCEDURE SP_UpdatePurchase(
    IN p_purchaseHeaderId INT,
    IN p_supplierId       INT,
    IN p_employeeId       INT,
    IN p_paymentMethod    VARCHAR(30),
    IN p_status           VARCHAR(20),
    IN p_invoiceNumber    VARCHAR(30),
    IN p_taxRate          DECIMAL(5,2),
    IN p_detailsJson      JSON
)
BEGIN
    DECLARE v_subtotal     DECIMAL(10,2);
    DECLARE v_taxAmount    DECIMAL(10,2);
    DECLARE v_total        DECIMAL(10,2);
    DECLARE v_headerSuppId INT;

    IF NOT EXISTS (SELECT 1 FROM PurchaseHeader WHERE purchaseHeaderId = p_purchaseHeaderId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La compra no existe.';
    END IF;

    IF EXISTS (SELECT 1 FROM PurchaseHeader WHERE purchaseHeaderId = p_purchaseHeaderId AND status = 'Anulado') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede editar una compra anulada.';
    END IF;

    IF JSON_LENGTH(p_detailsJson) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Debe incluir al menos un insumo.';
    END IF;

    -- Devolver stock anterior
    UPDATE Supply s
    INNER JOIN PurchaseDetail pd ON pd.supply_supplyId = s.supplyId
    SET s.availableQuantity = s.availableQuantity + pd.quantity
    WHERE pd.purchaseHeader_id = p_purchaseHeaderId;

    DELETE FROM PurchaseDetail WHERE purchaseHeader_id = p_purchaseHeaderId;

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

    INSERT INTO PurchaseDetail (
        quantity, unitPrice, subtotal,
        purchaseHeader_id, supply_supplyId, supplier_supplierId
    )
    SELECT
        j.quantity,
        j.unitPrice,
        j.quantity * j.unitPrice,
        p_purchaseHeaderId,
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

    -- Aplicar nuevo stock
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
    SET s.availableQuantity = s.availableQuantity - d.quantity;

    UPDATE PurchaseHeader
    SET
        supplier_supplierId = v_headerSuppId,
        paymentMethod       = p_paymentMethod,
        status              = p_status,
        invoiceNumber       = p_invoiceNumber,
        subtotal            = v_subtotal,
        tax                 = v_taxAmount,
        taxRate             = p_taxRate,
        total               = v_total
    WHERE purchaseHeaderId = p_purchaseHeaderId;

    UPDATE PurchaseInvoice
    SET subtotal = v_subtotal, taxAmount = v_taxAmount, totalAmount = v_total
    WHERE purchaseHeader_id = p_purchaseHeaderId;

    INSERT INTO PurchaseChangeLog (action, detail, purchaseHeader_id, employee_employeeId)
    VALUES (
        'Editó la compra',
        CONCAT('Compra editada. Nuevo total: $', v_total),
        p_purchaseHeaderId, p_employeeId
    );

    SELECT p_purchaseHeaderId AS purchaseHeaderId;
END$$
DELIMITER ;

-- ── SP_CancelPurchase ─────────────────────────────────────────
DROP PROCEDURE IF EXISTS SP_CancelPurchase$$
DELIMITER $$
CREATE PROCEDURE SP_CancelPurchase(
    IN p_purchaseHeaderId INT,
    IN p_employeeId       INT,
    IN p_reason           VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PurchaseHeader WHERE purchaseHeaderId = p_purchaseHeaderId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La compra no existe.';
    END IF;

    UPDATE Supply s
    INNER JOIN PurchaseDetail pd ON pd.supply_supplyId = s.supplyId
    SET s.availableQuantity = s.availableQuantity - pd.quantity
    WHERE pd.purchaseHeader_id = p_purchaseHeaderId;

    UPDATE PurchaseHeader
    SET status = 'Anulado'
    WHERE purchaseHeaderId = p_purchaseHeaderId;

    INSERT INTO PurchaseChangeLog (action, detail, purchaseHeader_id, employee_employeeId)
    VALUES (
        'Anuló la compra',
        CONCAT('Motivo: ', IFNULL(p_reason, 'Sin motivo especificado')),
        p_purchaseHeaderId, p_employeeId
    );
END$$
DELIMITER ;


-- ── SP_DecreaseStock ──────────────────────────────────────────
DROP PROCEDURE IF EXISTS SP_DecreaseStock$$
DELIMITER $$
CREATE PROCEDURE SP_DecreaseStock(
    IN p_supplyId   INT,
    IN p_quantity   DECIMAL(10,3),
    IN p_reason     VARCHAR(200),
    IN p_employeeId INT
)
BEGIN
    DECLARE v_current DECIMAL(10,3);

    SELECT availableQuantity INTO v_current
    FROM Supply WHERE supplyId = p_supplyId;

    IF v_current - p_quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Stock insuficiente.';
    END IF;

    UPDATE Supply
    SET availableQuantity = availableQuantity - p_quantity
    WHERE supplyId = p_supplyId;

    INSERT INTO StockAdjustment (
        quantityDecreased, reason, supply_supplyId, employee_employeeId
    )
    VALUES (p_quantity, IFNULL(p_reason, 'Ajuste manual'), p_supplyId, p_employeeId);
END$$

DELIMITER ;





-- 1. Eliminar los triggers problemáticos
DROP TRIGGER IF EXISTS trg_SaleHeader_after_insert;
DROP TRIGGER IF EXISTS trg_PurchaseHeader_after_insert;
DROP TRIGGER IF EXISTS trg_PurchaseInvoice_after_insert;

-- 2. Reemplazar SP_CreateSale con la generación del número incluida
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
    
        -- Descontar insumos según la receta de cada producto vendido
    UPDATE Supply s
    INNER JOIN SupplyProduct sp ON sp.supply_supplyId = s.supplyId
    INNER JOIN SaleDetail sd    ON sd.product_productId = sp.product_productId
    SET s.availableQuantity = s.availableQuantity - (sd.quantity * sp.quantity)
    WHERE sd.sale_saleId = v_newSaleId;

    SELECT v_newSaleId AS saleHeaderId;
END$$
DELIMITER ;

-- 3. Reemplazar SP_CreatePurchase con la generación del número incluida
DELIMITER $$
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
    DECLARE v_invoiceId       INT;
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

    -- Generar purchaseNumber aquí (ya no en el trigger)
    UPDATE PurchaseHeader
    SET purchaseNumber = CONCAT('C-', LPAD(v_headerId, 6, '0'))
    WHERE purchaseHeaderId = v_headerId;

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

    SET v_invoiceId = LAST_INSERT_ID();

    -- Generar invoiceNumber aquí (ya no en el trigger)
    UPDATE PurchaseInvoice
    SET invoiceNumber = CONCAT('F-', LPAD(v_invoiceId, 7, '0'))
    WHERE invoiceId = v_invoiceId;

    INSERT INTO PurchaseChangeLog (action, detail, purchaseHeader_id, employee_employeeId)
    VALUES (
        'Creó la compra',
        CONCAT('Compra registrada. Total: $', v_total, ' · ', JSON_LENGTH(p_detailsJson), ' insumo(s).'),
        v_headerId, p_employeeId
    );

    SELECT v_headerId AS purchaseHeaderId;
END$$
DELIMITER ;



-- MEJORA DE INVENTARIO

CREATE TABLE IF NOT EXISTS SupplyDailySnapshot (
    supplyDailySnapshotId INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    snapshotDate           DATE          NOT NULL,
    stockAtClose           DECIMAL(10,3) NOT NULL,
    supply_supplyId        INT           NOT NULL,
    CONSTRAINT FK_SupplyDailySnapshot_Supply
        FOREIGN KEY (supply_supplyId) REFERENCES Supply(supplyId),
    UNIQUE KEY UQ_Supply_Date (supply_supplyId, snapshotDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE StockAdjustment
    ADD COLUMN adjustmentType VARCHAR(20) NOT NULL DEFAULT 'CORRECTION';
    
    
ALTER TABLE StockAdjustment
    ADD COLUMN lossAmount DECIMAL(10,2) NULL;
    
    
ALTER TABLE Supply
    ADD COLUMN averageCost DECIMAL(10,2) NOT NULL DEFAULT 0;
DESCRIBE StockAdjustment;


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


