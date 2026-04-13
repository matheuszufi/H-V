import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Rsvp from './pages/Rsvp'
import Mapas from './pages/Mapas'
import PrivateRoute from './components/PrivateRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/confirmar" element={<Rsvp />} />
      <Route path="/mapas" element={<Mapas />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
    </Routes>
  )
}
