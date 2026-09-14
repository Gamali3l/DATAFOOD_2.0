import { useState, useEffect, useRef } from 'react';

import './Menuchatbot.css';

/* ══════════════════════════════════════════════════════════════
   CHATBOT DEL MENÚ — usa productos reales de la BD
   El componente recibe `products` y `phone` desde MenuClientes
   para construir el system prompt dinámicamente.
   ══════════════════════════════════════════════════════════════ */

const BOT_AVATAR = '🍽️';

const SUGGESTED_QUESTIONS = [
    '¿Qué me recomiendas hoy?',
    'Ay que calor, ¿qué me refrescas?',
    '¿Qué hay para desayunar?',
    '¿Cuál es el más barato?',
    '¿Tienen algo ligero?',
];

function buildSystemPrompt(products) {
    const disponibles = products.filter(p => p.status === 1);
    const agotados    = products.filter(p => p.status === 0);

    const formatList = (list) =>
        list.map(p =>
            `- ${p.name} | C$${Number(p.price).toFixed(0)} | Categoría: ${p.categoryName || 'General'}${p.description ? ` | "${p.description}"` : ''}`
        ).join('\n');

    return `Eres Raquelita, la asistente virtual amigable del Comedor Raquel en Nueva Guinea, Nicaragua.
Tu personalidad es cálida, simpática, un poco chistosa y muy nica. Usas expresiones como "¡Upe!", "¡Qué rico!", "con mucho amor", etc.
Ayudas a los clientes a elegir qué pedir según su estado de ánimo, antojo, clima o lo que quieran.
Cuando recomiendas algo, menciona el nombre y el precio. Solo recomiendas platillos DISPONIBLES.
Si el cliente quiere pedir, dile que puede escribir por WhatsApp.
Responde siempre en español, de forma corta y conversacional (máximo 3-4 oraciones).
No inventes productos que no están en el menú.

══ MENÚ ACTUAL ══

📗 DISPONIBLES (${disponibles.length} platillos):
${disponibles.length > 0 ? formatList(disponibles) : 'No hay platillos disponibles en este momento.'}

📕 AGOTADOS (${agotados.length} platillos):
${agotados.length > 0 ? formatList(agotados) : 'Ninguno agotado.'}

══ FIN DEL MENÚ ══

Hoy es ${new Date().toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
}

export default function MenuChatbot({ products = [], phone = '' }) {
    const [open,     setOpen]     = useState(false);
    const [messages, setMessages] = useState([]);
    const [input,    setInput]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [hasNew,   setHasNew]   = useState(false);
    const bottomRef  = useRef(null);
    const inputRef   = useRef(null);

    /* Mensaje de bienvenida al abrir */
    useEffect(() => {
        if (open && messages.length === 0) {
            const disponibles = products.filter(p => p.status === 1).length;
            setMessages([{
                role: 'assistant',
                content: `¡Upe! 👋 Soy Raquelita, tu asistente del Comedor Raquel. Hoy tenemos **${disponibles} platillos disponibles**. ¿En qué te puedo ayudar? Preguntame qué se te antoja o cómo te sentís 😄`,
            }]);
        }
        if (open) {
            setHasNew(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    /* Scroll al último mensaje */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function sendMessage(text) {
        const trimmed = (text || input).trim();
        if (!trimmed || loading) return;

        const userMsg = { role: 'user', content: trimmed };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        const requestBody = {
            model: 'llama-3.1-8b-instant',
            max_tokens: 1000,
            messages: [
                { role: 'system', content: buildSystemPrompt(products) },
                ...newMessages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
        };

        console.log('Body enviado a Groq:', requestBody);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    max_tokens: 1000,
                    messages: [
                        { role: 'system', content: buildSystemPrompt(products) },
                        ...newMessages.map(m => ({
                            role: m.role,
                            content: m.content,
                        })),
                    ],
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || 'Lo siento, no pude responder 😅';

            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

            if (!open) setHasNew(true);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '¡Ay! Tuve un problemita de conexión 😅 Intenta de nuevo.',
            }]);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    const waMsg = encodeURIComponent('Hola! Vi el menú y quiero hacer un pedido 😊');

    return (
        <>
            {/* ── FAB para abrir el chat ── */}
            <button
                className={`chatbot-fab ${hasNew ? 'chatbot-fab--pulse' : ''}`}
                onClick={() => setOpen(o => !o)}
                title="Hablar con Raquelita"
                aria-label="Abrir chat"
            >
                {open ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="24" height="24">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                )}
                {hasNew && <span className="chatbot-fab-dot" />}
            </button>

            {/* ── Ventana del chat ── */}
            {open && (
                <div className="chatbot-window">

                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-avatar">{BOT_AVATAR}</div>
                        <div className="chatbot-header-info">
                            <div className="chatbot-header-name">Raquelita</div>
                            <div className="chatbot-header-status">
                                <span className="chatbot-status-dot" />
                                Asistente del comedor
                            </div>
                        </div>
                        <button className="chatbot-header-close" onClick={() => setOpen(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>

                    {/* Mensajes */}
                    <div className="chatbot-messages">
                        {messages.map((m, i) => (
                            <ChatMessage key={i} message={m} />
                        ))}

                        {loading && (
                            <div className="chatbot-msg chatbot-msg--bot">
                                <div className="chatbot-msg-avatar">{BOT_AVATAR}</div>
                                <div className="chatbot-msg-bubble chatbot-msg-bubble--typing">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Preguntas sugeridas — solo al inicio */}
                    {messages.length <= 1 && !loading && (
                        <div className="chatbot-suggestions">
                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    className="chatbot-suggestion-btn"
                                    onClick={() => sendMessage(q)}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="chatbot-input-row">
                        <input
                            ref={inputRef}
                            className="chatbot-input"
                            type="text"
                            placeholder="Escribí tu pregunta..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            maxLength={300}
                        />
                        <button
                            className="chatbot-send-btn"
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim()}
                            aria-label="Enviar"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>

                    {/* Footer WhatsApp */}
                    {phone && (
                        <div className="chatbot-footer">
                            <a
                                href={`https://wa.me/${phone}?text=${waMsg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="chatbot-footer-wa"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Hacer pedido por WhatsApp
                            </a>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

/* ── Renderiza un mensaje individual con soporte para **negrita** ── */
function ChatMessage({ message }) {
    const isBot = message.role === 'assistant';

    // Convierte **texto** en <strong>
    const formatted = message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return (
        <div className={`chatbot-msg ${isBot ? 'chatbot-msg--bot' : 'chatbot-msg--user'}`}>
            {isBot && <div className="chatbot-msg-avatar">{BOT_AVATAR}</div>}
            <div
                className={`chatbot-msg-bubble ${isBot ? 'chatbot-msg-bubble--bot' : 'chatbot-msg-bubble--user'}`}
                dangerouslySetInnerHTML={{ __html: formatted }}
            />
        </div>
    );
}