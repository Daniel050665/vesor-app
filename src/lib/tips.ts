// Conceptos breves que el panel muestra como «Dato del día» (uno distinto cada día).
export const DAILY_TIPS = [
  { title: "Diversificar", text: "Repartir tu dinero entre varios activos reduce el golpe si uno de ellos cae.", ask: "¿Qué es diversificar y cómo empiezo?" },
  { title: "Volatilidad", text: "Mide cuánto sube y baja un precio. Más volatilidad: ganancias y pérdidas más bruscas.", ask: "¿Qué es la volatilidad?" },
  { title: "ETF", text: "Una sola compra te da una canasta de muchas empresas. Es una forma sencilla de diversificar.", ask: "¿Qué es un ETF y por qué diversifica?" },
  { title: "Interés compuesto", text: "Si reinviertes lo que ganas, tu dinero crece sobre lo ya ganado. El tiempo es tu aliado.", ask: "¿Qué es el interés compuesto?" },
  { title: "Caída máxima", text: "Antes de invertir, pregúntate si soportarías ver tu inversión caer 30% sin vender.", ask: "¿Qué es la caída máxima de un activo?" },
  { title: "Promesas garantizadas", text: "Ninguna inversión real garantiza duplicar tu dinero. Desconfía de quien lo prometa.", ask: "¿Cómo reconozco una estafa de inversión?" },
  { title: "Horizonte", text: "Si vas a necesitar el dinero pronto, los activos muy volátiles son más arriesgados.", ask: "¿Qué es el horizonte de inversión?" },
  { title: "Inflación", text: "Si tu dinero rinde menos que la inflación, en realidad pierdes poder de compra.", ask: "¿Qué es la inflación y cómo afecta mis ahorros?" },
  { title: "RSI", text: "Indicador de 0 a 100. Sobre 70 el precio subió rápido; bajo 30 cayó con fuerza.", ask: "¿Qué es el RSI?" },
  { title: "Liquidez", text: "Es qué tan rápido puedes vender sin perder valor. Ten un fondo de emergencia aparte.", ask: "¿Qué es la liquidez de una inversión?" },
] as const;

export function tipOfTheDay(date = new Date()) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return DAILY_TIPS[day % DAILY_TIPS.length];
}
