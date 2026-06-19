# NeighborRent — P2P аренда вещей между соседями

React + Vite + Supabase + Leaflet

---

## Быстрый старт

### 1. Supabase — создай проект

1. Зайди на [supabase.com](https://supabase.com) → New project
2. Запомни **URL** и **anon key** (Settings → API)
3. Открой **SQL Editor** → вставь и выполни `supabase_schema.sql`

### 2. Настрой .env

```bash
cp .env.example .env
```

Открой `.env`, вставь свои ключи:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Запусти локально

```bash
npm install
npm run dev
```

Открой http://localhost:5173

---

## Деплой на Vercel (бесплатно)

1. Запушь на GitHub
2. [vercel.com](https://vercel.com) → Import Project
3. Добавь переменные окружения из `.env`
4. Deploy → получишь `https://neighborrent.vercel.app`

---

## Структура

```
src/
├── context/AuthContext.jsx     # Auth + профиль
├── lib/supabase.js             # Supabase клиент
├── components/
│   ├── Layout.jsx              # Шапка + нижняя навигация
│   └── Toast.jsx               # Уведомления
└── pages/
    ├── AuthPage.jsx            # Вход / регистрация
    ├── BrowsePage.jsx          # Карта + список вещей
    ├── ItemPage.jsx            # Детали вещи + бронирование
    ├── AddItemPage.jsx         # Добавить вещь
    ├── MyRentalsPage.jsx       # Мои аренды
    └── ProfilePage.jsx         # Профиль + управление вещами
```

---

## Что работает в MVP

- ✅ Регистрация / вход (Supabase Auth)
- ✅ Карта с вещами (OpenStreetMap + Leaflet)
- ✅ Поиск и фильтрация по категориям
- ✅ Бронирование с расчётом цены и залога
- ✅ Добавление вещи с автоопределением локации
- ✅ Управление арендами (принять / завершить / отменить)
- ✅ Профиль + управление своими вещами

## Следующие шаги

- [ ] Stripe — залог через hold на карте
- [ ] Supabase Storage — фото вещей
- [ ] Realtime-чат арендатор ↔ владелец
- [ ] Push-уведомления
- [ ] React Native (мобилка)
