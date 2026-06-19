import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import BrowsePage from './pages/BrowsePage'
import ItemPage from './pages/ItemPage'
import AddItemPage from './pages/AddItemPage'
import MyRentalsPage from './pages/MyRentalsPage'
import ProfilePage from './pages/ProfilePage'
import RequestsPage from './pages/RequestsPage'
import NotFoundPage from './pages/NotFoundPage'
import SuccessPage from './pages/SuccessPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loader"><div className="spinner" /></div>
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<BrowsePage />} />
          <Route path="item/:id" element={<ItemPage />} />
          <Route path="add" element={<AddItemPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="rentals" element={<MyRentalsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="success" element={<SuccessPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
