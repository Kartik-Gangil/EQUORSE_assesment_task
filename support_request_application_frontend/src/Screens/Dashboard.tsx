import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

type RequestRow = {
    id: number
    name: string
    email: string
    message: string
    classified_as: 'SALES' | 'TECHNICAL' | 'BILLING' | 'GENERAL'
    priority: 'Low' | 'Medium' | 'High'
    created_at: string
    status: string
    classification_source: "AI" | "HUMAN"
}


export function Dashboard() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [rows, setRows] = useState<RequestRow[]>([])
    const [selectedPriority, setSelectedPriority] = useState<'All' | RequestRow['priority']>('All')
    const [selectedClassification, setSelectedClassification] = useState<'All' | RequestRow['classified_as']>('All')

    const priorityOptions = useMemo(
        () => ['All', ...Array.from(new Set(rows.map((row) => row.priority)))],
        [rows]
    )

    const classificationOptions = useMemo(
        () => ['All', ...Array.from(new Set(rows.map((row) => row.classified_as)))],
        [rows]
    )

    const filteredRows = rows.filter((request) => {
        const matchesPriority = selectedPriority === 'All' || request.priority === selectedPriority
        const matchesClassification = selectedClassification === 'All' || request.classified_as === selectedClassification
        return matchesPriority && matchesClassification
    })

    const highPriorityCount = filteredRows.filter((row) => row.priority === 'High').length

    const categoryCounts = useMemo(() => {
        return filteredRows.reduce<Record<string, number>>((acc, row) => {
            acc[row.classified_as] = (acc[row.classified_as] ?? 0) + 1
            return acc
        }, {})
    }, [filteredRows])

    const mostCommonCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

    useEffect(() => {
        const storedCredentials = localStorage.getItem("credentials");
        if (!storedCredentials) return;
        try {
            const credentials = JSON.parse(storedCredentials)
            if (!credentials?.token) {
                navigate('/login')
            }
            else {
                setEmail(credentials?.email);
                fetchRequest();
            }
        } catch (error) {
            console.error('Invalid credentials in localStorage:', error)
            localStorage.removeItem('credentials')
        }
    }, [navigate])


    const fetchRequest = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/request`, {
                method: "GET"
            })
            const data = await res.json()
            console.log(data)
            setRows(data);
        } catch (error) {
            console.error(error);
        }
    }


    const handleLogout = () => {
        try {
            localStorage.removeItem('credentials');
            navigate("/login")
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">Dashboard</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">Support requests</h1>
                    <p className="mt-1 text-sm text-slate-500">Logged in as: {email}</p>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 hover:cursor-pointer"
                >
                    Logout
                </button>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
                    <p className="text-sm text-slate-500">Total tickets</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{filteredRows.length}</p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
                    <p className="text-sm text-slate-500">High priority</p>
                    <p className="mt-2 text-3xl font-bold text-amber-600">{highPriorityCount}</p>
                </div>
                <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
                    <p className="text-sm text-slate-500">Top category</p>
                    <p className="mt-2 text-xl font-bold text-emerald-600">
                        {mostCommonCategory ? `${mostCommonCategory[0]} (${mostCommonCategory[1]})` : '—'}
                    </p>
                </div>
            </div>

            <div className="mb-6 grid gap-4 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200 md:grid-cols-2">
                <div>
                    <label htmlFor="priority-filter" className="mb-2 block text-sm font-medium text-slate-700">
                        Filter by priority
                    </label>
                    <select
                        id="priority-filter"
                        value={selectedPriority}
                        onChange={(event) => setSelectedPriority(event.target.value as 'All' | RequestRow['priority'])}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    >
                        {priorityOptions.map((option) => (
                            <option key={option} value={option}>
                                {option === 'All' ? 'All priorities' : option}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="classification-filter" className="mb-2 block text-sm font-medium text-slate-700">
                        Filter by category
                    </label>
                    <select
                        id="classification-filter"
                        value={selectedClassification}
                        onChange={(event) => setSelectedClassification(event.target.value as 'All' | RequestRow['classified_as'])}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    >
                        {classificationOptions.map((option) => (
                            <option key={option} value={option}>
                                {option === 'All' ? 'All categories' : option}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-5 py-3 font-semibold">ID</th>
                                <th className="px-5 py-3 font-semibold">Customer</th>
                                <th className="px-5 py-3 font-semibold">Email</th>
                                <th className="px-5 py-3 font-semibold">Message</th>
                                <th className="px-5 py-3 font-semibold">Status</th>
                                <th className="px-5 py-3 font-semibold">Classification Source</th>
                                <th className="px-5 py-3 font-semibold">Category</th>
                                <th className="px-5 py-3 font-semibold">Priority</th>
                                <th className="px-5 py-3 font-semibold">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {filteredRows?.map((request) => (
                                <tr key={request.id} className="hover:bg-slate-50">
                                    <td className="px-5 py-4 font-medium text-slate-700">#{request.id}</td>
                                    <td className="px-5 py-4 text-slate-700">{request.name}</td>
                                    <td className="px-5 py-4 text-slate-600">{request.email}</td>
                                    <td className="px-5 py-4 text-slate-700">{request.message}</td>
                                    <td className="px-5 py-4 text-slate-700">{request.status}</td>
                                    <td className="px-5 py-4 text-slate-700">{request.classification_source}</td>
                                    <td className="px-5 py-4">
                                        <span>
                                            {request.classified_as}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${request.priority === 'High'
                                                ? 'bg-rose-100 text-rose-700'
                                                : request.priority === 'Medium'
                                                    ? 'bg-violet-100 text-violet-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                }`}
                                        >
                                            {request.priority}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span>
                                            {new Date(request.created_at).toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
