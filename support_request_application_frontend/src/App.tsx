import { Routes, Route } from "react-router-dom"
import { LoginForm } from "./Screens/LoginForm"
import Form from "./Screens/Form"
import { Dashboard } from "./Screens/Dashboard"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/" element={<Form />} />
    </Routes>
  )
}

export default App
