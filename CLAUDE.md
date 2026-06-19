# NeighborRent — Техническое задание для Claude Code

## Что это

P2P-маркетплейс аренды вещей между соседями. Пользователи сдают и берут в аренду дрели, велосипеды, камеры и т.д. по часам с залогом.

---

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | React 18 + Vite, React Router v6 |
| Map | Leaflet + react-leaflet, OpenStreetMap/Nominatim |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) |
| Уведомления | Browser Notification API (push), Supabase Realtime (badges) |
| Email | Resend через Supabase Edge Function (не задеплоено) |
| Стили | CSS-переменные в `index.css`, никаких UI-библиотек |
| Оплата | Stripe (не реализован — нет аккаунта у клиента) |

---

## Структура файлов

```
neighborrent/
├── src/
│   ├── App.jsx                  # Router + PrivateRoute
│   ├── main.jsx
│   ├── index.css                # Все стили, CSS-переменные
│   ├── lib/
│   │   └── supabase.js          # createClient(url, key)
│   ├── context/
│   │   └── AuthContext.jsx      # user, profile, signOut, fetchProfile
│   ├── hooks/
│   │   └── useNotifications.js  # pendingRentals, unreadMessages, markMessagesRead, refetch
│   ├── components/
│   │   ├── Layout.jsx           # Хедер + нижняя навигация (5 пунктов) + badges
│   │   ├── Chat.jsx             # Realtime чат по rental_id
│   │   └── ImageUpload.jsx      # Загрузка до 5 фото в Supabase Storage (bucket: item-images)
│   └── pages/
│       ├── AuthPage.jsx         # Вход/регистрация, RU перевод ошибок, показать пароль
│       ├── BrowsePage.jsx       # Карта + список вещей, DivIcon маркеры, фильтры, MapAutoFit
│       ├── ItemPage.jsx         # Детали вещи, бронирование (start+end datetime), карусель фото
│       ├── AddItemPage.jsx      # Форма добавления вещи, геолокация + ручной ввод координат
│       ├── MyRentalsPage.jsx    # Аренды (арендую / сдаю), статусы, inline чат
│       ├── RequestsPage.jsx     # Карта запросов на аренду, форма добавления запроса
│       ├── ProfilePage.jsx      # Профиль, мои вещи, выход
│       └── NotFoundPage.jsx     # 404
├── supabase/
│   └── functions/
│       └── notify-rental/
│           └── index.ts         # Edge Function для email через Resend (НЕ задеплоена)
├── supabase_schema.sql          # ✅ УЖЕ ВЫПОЛНЕН в Supabase
├── supabase_badges.sql          # ⚠️ НУЖНО ВЫПОЛНИТЬ (message_reads + realtime for rentals)
├── supabase_requests.sql        # ⚠️ НУЖНО ВЫПОЛНИТЬ (rental_requests table + RLS + realtime)
└── .env                         # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

---

## Supabase проект

- **URL:** `https://aouekfafucoalxmmdxza.supabase.co`
- **Anon key:** в файле `.env`
- **Auth:** email + password, подтверждение email ОТКЛЮЧЕНО
- **Storage bucket:** `item-images` (публичный)

### Таблицы (уже созданы через supabase_schema.sql)

```sql
profiles(id, full_name, phone, address, rating, created_at)
items(id, owner_id, title, description, category, price_per_hour, deposit,
      address, lat, lng, images jsonb, is_available, created_at)
rentals(id, item_id, renter_id, owner_id, status, start_time, end_time,
        hours, total_price, deposit_hold, created_at)
messages(id, rental_id, sender_id, text, created_at)
```

### Таблицы (нужно создать — SQL файлы в корне проекта)

```sql
-- supabase_badges.sql:
message_reads(user_id, rental_id, last_read_at)  -- для счётчика непрочитанных

-- supabase_requests.sql:
rental_requests(id, user_id, title, description, category,
                lat, lng, address, status, expires_at, created_at)
```

---

## Навигация (5 пунктов в нижней панели)

| Путь | Иконка | Страница |
|------|--------|----------|
| `/` | 🗺️ | BrowsePage — карта + список вещей |
| `/requests` | 🔍 | RequestsPage — запросы на аренду |
| `/rentals` | 📦 | MyRentalsPage — мои аренды (с badge) |
| `/add` | ➕ | AddItemPage — добавить вещь |
| `/profile` | 👤 | ProfilePage — профиль |

---

## Ключевые паттерны — соблюдай при правках

### Карта (Leaflet)
- Маркеры вещей — **зелёные** DivIcon с ценой: `background:#22c55e`
- Маркеры запросов — **синие** DivIcon с emoji: `background:#3b82f6`
- Компонент `MapAutoFit` — `useMap()` + `fitBounds` при монтировании
- Никогда не используй внешние PNG иконки — они не грузятся офлайн

### Supabase запросы
```js
// Всегда деструктурируй data и error:
const { data, error } = await supabase.from('items').select('*')

// Для связанных данных используй вложенный select:
supabase.from('rentals').select('*, items(title, category), profiles!rentals_renter_id_fkey(full_name)')
```

### CSS-переменные (из index.css)
```css
--green: #22c55e
--green-light: #f0fdf4
--green-dark: #15803d
--gray: #6b7280
--border: #e5e7eb
--light: #f9fafb
--dark: #111827
--red: #ef4444
```

### Классы компонентов
```
.btn .btn-primary .btn-secondary .btn-ghost .btn-danger
.btn-sm .btn-lg .btn-full
.card
.form-group .form-label .form-input
.badge .badge-green .badge-yellow .badge-red .badge-gray
.empty-state .empty-state-icon
.spinner
```

### Заголовки страниц
Каждая страница обязана устанавливать:
```js
useEffect(() => { document.title = 'Название — NeighborRent' }, [])
```

---

## Что НЕ реализовано (бэклог)

### Обязательно (нужно доделать)
1. **Email уведомления** — задеплоить Edge Function `notify-rental`:
   - Нужен Resend аккаунт → API ключ → `supabase secrets set RESEND_API_KEY=...`
   - Затем: `supabase functions deploy notify-rental`
   - Function уже написана в `supabase/functions/notify-rental/index.ts`

2. **Запустить SQL** — выполнить в Supabase SQL Editor:
   - `supabase_badges.sql` (message_reads для badge чата)
   - `supabase_requests.sql` (rental_requests для страницы запросов)

### Планируется
3. **Stripe** — депозит/залог при бронировании (у клиента нет аккаунта Stripe)
   - Интеграция: Stripe Checkout → Supabase Edge Function → webhook → обновление статуса аренды

4. **React Native / Expo** — мобильное приложение (деferred до завершения веб-версии)
   - Shared Supabase backend, тот же дизайн-язык
   - Push: Expo Notifications вместо Browser Notification API

5. **Деплой** — Netlify Drop (`npm run build` → перетащить папку `dist/` на app.netlify.com/drop)

### Идеи для следующих итераций
- Рейтинг и отзывы после завершения аренды
- Верификация пользователей (фото паспорта)
- Календарь занятости вещи
- Оповещение владельца когда поступает запрос на его категорию вещей
- Фильтр по радиусу на карте (сейчас показывает всё)

---

## Как запустить локально

```bash
cd neighborrent
npm install        # если нет node_modules
npm run dev        # → http://localhost:5173
```

Если ошибка `Cannot find native binding @rolldown/binding`:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Стиль кода

- Компоненты — функциональные, без классов
- Inline styles предпочтительнее новых CSS классов (кроме уже существующих утилит)
- Локаторы — `id`, `data-testid` (для будущих автотестов)
- Все тексты интерфейса — на **русском языке**
- Обработка ошибок Supabase — всегда показывай `setError(error.message)` пользователю
- Геолокация — всегда предоставляй ручной fallback (поля lat/lng)
