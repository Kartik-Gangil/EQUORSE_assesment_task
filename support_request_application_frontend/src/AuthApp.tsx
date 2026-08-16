import { useState } from 'react'
import { Dashboard } from './Screens/Dashboard'
import { LoginForm } from './Screens/LoginForm'

export default function AuthApp() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [userEmail, setUserEmail] = useState('')

    const handleLogout = () => {
        setIsLoggedIn(false)
        setUserEmail('')
    }

    return isLoggedIn ? (
        <Dashboard email={userEmail} onLogout={handleLogout} />
    ) : (
        <LoginForm />
    )
}
