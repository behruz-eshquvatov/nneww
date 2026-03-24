import { Route, Routes } from 'react-router-dom'
import NotFoundPage from './pages/NotFoundPage'
import StorePage from './pages/StorePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StorePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
