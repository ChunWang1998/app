import { Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import MapPage from './pages/MapPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/map" element={<MapPage />} />
    </Routes>
  )
}
