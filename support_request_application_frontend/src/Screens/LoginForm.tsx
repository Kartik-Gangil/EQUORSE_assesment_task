import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function LoginForm() {
    const [formData, setFormData] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const storedCredentials = localStorage.getItem('credentials')

        if (!storedCredentials) return

        try {
            const credentials = JSON.parse(storedCredentials)
            if (credentials?.token) {
                navigate('/dashboard')
            }
        } catch (error) {
            console.error('Invalid credentials in localStorage:', error)
            localStorage.removeItem('credentials')
        }
    }, [navigate])


    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        setError('')
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        try {
            const email = formData.email.trim()
            const password = formData.password.trim()
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

            if (!email || !password) {
                setError('Please enter both email and password.')
                return
            }

            if (!emailPattern.test(email)) {
                setError('Please enter a valid email address.')
                return
            }

            if (password.length < 6) {
                setError('Password must be at least 6 characters long.')
                return
            }
            const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "Application/Json"
                },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json();
            console.log(data)
            if (data.success === false) setError(data.message)
            else {
                localStorage.setItem(
                    'credentials',
                    JSON.stringify({
                        name: data.user.name,
                        token: data.token,
                        email: data.user.email,
                    }),
                )
                navigate("/dashboard")
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="mx-auto flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-2">
                <div className="hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-100">
                            Support Center
                        </p>
                        <h1 className="mt-6 text-4xl font-bold leading-tight">Welcome back</h1>
                    </div>

                    <div className="space-y-4 text-indigo-50/90">
                        <p>Manage tickets, track requests, and respond faster with your support dashboard.</p>
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                            <p className="text-sm font-medium text-white">Live support stats</p>
                            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p className="text-2xl font-bold">142</p>
                                    <p className="text-xs text-indigo-100">Tickets</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">86%</p>
                                    <p className="text-xs text-indigo-100">Solved</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">24h</p>
                                    <p className="text-xs text-indigo-100">Avg reply</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 lg:p-12">
                    <div className="mb-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">Login</p>
                        <h2 className="mt-3 text-3xl font-bold text-slate-900">Sign in to your account</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
