import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import SingleStage from './pages/SingleStage'
import TwoStage from './pages/TwoStage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header>
          <div className="header-left">
            <h1>NH₃ Refrigeration Calculator</h1>
            <p>Powered by CoolProp · R-717 Ammonia</p>
          </div>
          <nav>
            <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              Single-stage
            </NavLink>
            <NavLink to="/twostage" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              Two-stage
            </NavLink>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<SingleStage />} />
          <Route path="/twostage" element={<TwoStage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
