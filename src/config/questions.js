export const questions = [
  {
    id: 1,
    question: { en: 'What is your ultimate idea of a perfect Saturday?', es: '¿Cuál es tu idea de un sábado perfecto?' },
    options: [
      { id: 'night_out', en: 'A wild night out', es: 'Una noche de fiesta' },
      { id: 'cozy_home', en: 'Cozy night at home', es: 'Una noche tranquila en casa' },
      { id: 'outdoor_trip', en: 'Spontaneous outdoor trip', es: 'Una escapada improvisada al aire libre' }
    ]
  },
  {
    id: 2,
    question: { en: 'How do you prefer to text someone you like?', es: '¿Cómo prefieres escribirte con alguien que te gusta?' },
    options: [
      { id: 'instant_replies', en: 'Instant replies all day', es: 'Respuestas al instante todo el día' },
      { id: 'long_messages', en: 'Deep long messages', es: 'Mensajes largos y profundos' },
      { id: 'memes', en: 'Memes & short check-ins', es: 'Memes y mensajes cortos' }
    ]
  },
  {
    id: 3,
    question: { en: 'How do you usually handle travel or day trips?', es: '¿Cómo sueles organizar los viajes o las excursiones?' },
    options: [
      { id: 'planned', en: 'Strict planned itinerary', es: 'Un itinerario planificado al detalle' },
      { id: 'spontaneous', en: 'Pure spontaneity', es: 'Pura improvisación' },
      { id: 'flexible', en: 'Loose plan with flexibility', es: 'Un plan flexible' }
    ]
  },
  {
    id: 4,
    question: { en: 'After a long, stressful week, how do you recharge?', es: 'Después de una semana larga y estresante, ¿cómo recargas pilas?' },
    options: [
      { id: 'alone_movies', en: 'Alone time & movies', es: 'Tiempo a solas y pelis' },
      { id: 'close_friends', en: 'Small group of close friends', es: 'Un grupo pequeño de amigos cercanos' },
      { id: 'crowded_events', en: 'Crowded social events', es: 'Planes con mucha gente' }
    ]
  },
  {
    id: 5,
    question: { en: 'When a minor argument happens, what is your go-to response?', es: 'Cuando surge una pequeña discusión, ¿qué sueles hacer?' },
    options: [
      { id: 'talk_now', en: 'Talk it out immediately', es: 'Hablarlo en el momento' },
      { id: 'cool_off', en: 'Take time to cool off', es: 'Tomarme un tiempo para calmarme' },
      { id: 'humor', en: 'Use humor to ease tension', es: 'Usar el humor para relajar el ambiente' }
    ]
  },
  {
    id: 6,
    question: { en: 'If someone calls at midnight for a random late-night drive:', es: 'Si alguien te llama a medianoche para dar una vuelta en coche sin rumbo:' },
    options: [
      { id: 'in_the_car', en: "I'm in the car!", es: '¡Ya estoy en el coche!' },
      { id: 'only_food', en: 'Only if we get food!', es: '¡Solo si vamos a comer algo!' },
      { id: 'sleeping', en: 'No way, sleeping.', es: 'Ni de broma, a dormir.' }
    ]
  },
  {
    id: 7,
    question: { en: 'What matters most to you in an initial connection?', es: '¿Qué es lo que más te importa al conocer a alguien?' },
    options: [
      { id: 'humor', en: 'Matching sense of humor', es: 'Compartir el sentido del humor' },
      { id: 'values', en: 'Shared values & goals', es: 'Valores y metas en común' },
      { id: 'comfort', en: 'Effortless comfort', es: 'Sentirse a gusto sin esfuerzo' }
    ]
  }
];

export function findOption(questionId, optionId) {
  return questions.find((question) => question.id === Number(questionId))?.options.find((option) => option.id === optionId);
}
