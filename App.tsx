import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Message, Suggestion } from './types';
import { SYSTEM_INSTRUCTION, SUGGESTIONS, RESOURCES } from './constants';

// --- Assets ---
const LOGO_CUENTAS_SANAS = "https://intucuman.info/images/resize/169663-640x360.webp";
const LOGO_FUNDACION = "https://idep.gov.ar/aulavirtual/wp-content/uploads/2021/07/Logo-Fundacion.png";

// --- Icons ---
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const BotIcon = () => (
  <div className="w-8 h-8 rounded-full bg-[#023059] flex items-center justify-center text-white shadow-sm overflow-hidden p-1">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  </div>
);

const UserIcon = () => (
  <div className="w-8 h-8 rounded-full bg-[#7292A6] flex items-center justify-center text-white shadow-sm">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  </div>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);


// --- Main Component ---

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '¡Hola! Soy tu **Asistente de Formación** para el taller *Cuentas Sanas sin esfuerzo*.\n\nEstoy acá para ayudarte a preparar la clase, repasar las dinámicas (como la de la familia Paganini) y resolver dudas sobre la Guía del Orientador.\n\n¿Por dónde te gustaría empezar hoy?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiClientRef = useRef<GoogleGenAI | null>(null);

  // Initialize AI Client
  useEffect(() => {
     if (process.env.API_KEY) {
         aiClientRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
     } else {
         console.error("API_KEY is missing in environment variables.");
     }
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !aiClientRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const chat = aiClientRef.current.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: SYSTEM_INSTRUCTION
        },
        history: history
      });

      const result = await chat.sendMessageStream({ message: text });
      
      let fullResponse = "";
      const botMessageId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
          id: botMessageId,
          role: 'model',
          text: "",
          timestamp: new Date()
      }]);

      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullResponse += chunkText;
          setMessages(prev => prev.map(msg => 
              msg.id === botMessageId ? { ...msg, text: fullResponse } : msg
          ));
        }
      }

    } catch (error) {
      console.error("Error generating response:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Lo siento, tuve un problema al conectar con el servidor. Por favor intenta nuevamente.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (query: string) => {
    handleSendMessage(query);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-[#023059]">{part.slice(2, -2)}</strong>;
      }
      if (part.includes('http')) {
         const words = part.split(' ');
         return (
             <span key={index}>
                 {words.map((word, wIdx) => {
                     if (word.startsWith('http') || word.startsWith('www')) {
                         return <a key={wIdx} href={word} target="_blank" rel="noopener noreferrer" className="text-[#365B73] hover:underline break-all">{word} </a>
                     }
                     return word + ' ';
                 })}
             </span>
         )
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2F2F2]">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:flex-col w-80 bg-white border-r border-gray-200 shadow-sm z-10">
         <SidebarContent />
      </div>

      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
           <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setSidebarOpen(false)}></div>
           <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white transition-transform transform duration-300 ease-in-out">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                 <button onClick={() => setSidebarOpen(false)} className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                    <span className="sr-only">Close sidebar</span>
                    <CloseIcon />
                 </button>
              </div>
              <SidebarContent />
           </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between shadow-sm z-10 h-20">
          <div className="flex items-center gap-4">
             <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
                <MenuIcon />
             </button>
             {/* Logo Container */}
            <div className="h-14 w-auto flex items-center justify-center overflow-hidden">
                <img src={LOGO_CUENTAS_SANAS} alt="Cuentas Sanas" className="h-full w-auto object-contain" />
            </div>
            <div className="hidden sm:block border-l border-gray-300 pl-4 h-10 flex flex-col justify-center">
                <h1 className="text-lg font-bold text-[#023059] leading-none">Asistente de Formación</h1>
                <p className="text-xs text-[#365B73] font-medium mt-1">Guía del Orientador</p>
            </div>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide bg-[#F2F2F2]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="flex-shrink-0 mt-1">
                  {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
                </div>
                
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                    className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                        ? 'bg-[#023059] text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}
                    >
                    {renderText(msg.text)}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                        {formatTime(msg.timestamp)}
                    </span>
                </div>
              </div>
            </div>
          ))}
           {isLoading && (
              <div className="flex justify-start w-full">
                  <div className="flex max-w-[85%] gap-3">
                      <div className="flex-shrink-0 mt-1"><BotIcon /></div>
                      <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#7292A6] rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-[#7292A6] rounded-full animate-bounce delay-75"></div>
                          <div className="w-2 h-2 bg-[#7292A6] rounded-full animate-bounce delay-150"></div>
                      </div>
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Area */}
        {messages.length < 3 && (
            <div className="px-4 pb-2 md:px-6">
                <p className="text-xs text-[#7292A6] mb-2 font-medium uppercase tracking-wider">Temas sugeridos</p>
                <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion.query)}
                            className="text-xs md:text-sm bg-white hover:bg-[#023059] text-[#023059] hover:text-white border border-[#023059]/20 py-2 px-4 rounded-full transition-colors shadow-sm"
                        >
                            {suggestion.label}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4 md:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-3 relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntá sobre la guía, actividades o dinámicas..."
              className="flex-1 bg-[#F2F2F2] text-gray-800 placeholder-gray-500 border-0 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-[#023059] focus:bg-white transition-all shadow-inner"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#023059] hover:bg-[#023859] disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3.5 rounded-xl transition-all shadow-md transform active:scale-95"
            >
              <SendIcon />
            </button>
          </form>
          <div className="text-center mt-2">
              <p className="text-[10px] text-gray-400">Este asistente es una herramienta de apoyo para orientadores.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent() {
    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-[#023059]">Recursos Rápidos</h2>
                <p className="text-xs text-[#365B73] mt-1">Material para el orientador</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {RESOURCES.map((resource, idx) => (
                    <a 
                        key={idx} 
                        href={resource.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-[#7292A6] transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{resource.icon}</span>
                            <div>
                                <h3 className="font-semibold text-[#023059] text-sm group-hover:text-[#365B73] transition-colors">{resource.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{resource.description}</p>
                            </div>
                        </div>
                    </a>
                ))}
                
                <div className="bg-[#023059]/5 rounded-xl p-4 border border-[#023059]/10 mt-6">
                    <h3 className="text-[#023059] font-bold text-sm mb-2">💡 Tip de Facilitación</h3>
                    <p className="text-xs text-[#365B73] leading-relaxed">
                        Recordá que los talleres son participativos. Usá las preguntas disparadoras de la guía para generar debate.
                    </p>
                </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-white flex flex-col items-center">
                 <img src={LOGO_FUNDACION} alt="Fundación Banco Macro" className="h-12 w-auto mb-2 object-contain" />
                <div className="text-[10px] text-gray-400 text-center">
                    Programa de Economía Personal<br/>
                    y Familiar
                </div>
            </div>
        </div>
    );
}