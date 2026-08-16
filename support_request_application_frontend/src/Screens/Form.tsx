import { useState } from 'react'

type RequestPriority = 'Low' | 'Medium' | 'High'

type DuplicateEntry = {
    email: string
    message: string
    priority: RequestPriority
    submittedAt: number
}

const DUPLICATE_WINDOW_MS = 60_000
const DUPLICATE_STORAGE_KEY = 'support_request_duplicate_cache'

const normalizeMessage = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, ' ')

const normalizePriority = (value: string): RequestPriority => {
    if (value === 'High' || value === 'Medium' || value === 'Mid' || value === 'Low') {
        return value as RequestPriority
    }

    return 'Medium'
}

const getPriorityRank = (priority: string) => {
    switch (priority) {
        case 'Low':
            return 1
        case 'Mid':
        case 'Medium':
            return 2
        case 'High':
            return 3
        default:
            return 0
    }
}

const getDuplicateCache = (): DuplicateEntry[] => {
    try {
        const cachedValue = localStorage.getItem(DUPLICATE_STORAGE_KEY)
        if (!cachedValue) return []

        const parsed = JSON.parse(cachedValue) as DuplicateEntry[]
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

const saveDuplicateCache = (entries: DuplicateEntry[]) => {
    localStorage.setItem(DUPLICATE_STORAGE_KEY, JSON.stringify(entries))
}

const sampleComplaint = {
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    message: "hey so I upgraded to the pro plan last week hoping it would fix the export bug you guys never patched, but now I'm getting charged twice AND the export still fails with a 500 error. this is the third time I'm reaching out about this. at this point just cancel everything and refund me, I'm done. also is there a way to talk to sales about a custom plan instead because clearly the standard tiers don't work for my use case",
    priority: 'High' as RequestPriority,
}

const Form = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
        priority: 'Medium' as RequestPriority,
    })
    const [submissionMessage, setSubmissionMessage] = useState('')

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = event.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleFillSampleCase = () => {
        setFormData({
            name: sampleComplaint.name,
            email: sampleComplaint.email,
            message: sampleComplaint.message,
            priority: sampleComplaint.priority,
        })
        setSubmissionMessage('Sample complaint loaded into the form.')
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const normalizedEmail = formData.email.trim().toLowerCase()
        const normalizedMessage = normalizeMessage(formData.message)
        const incomingPriority = normalizePriority(formData.priority)

        const now = Date.now()
        const cache = getDuplicateCache().filter((entry) => now - entry.submittedAt <= DUPLICATE_WINDOW_MS)

        const duplicateEntry = cache.find((entry) => {
            return entry.email === normalizedEmail && entry.message === normalizedMessage
        })

        if (duplicateEntry) {
            const currentPriorityRank = getPriorityRank(duplicateEntry.priority)
            const incomingPriorityRank = getPriorityRank(incomingPriority)

            if (incomingPriorityRank > currentPriorityRank) {
                const updatedEntry: DuplicateEntry = {
                    ...duplicateEntry,
                    priority: incomingPriority,
                    submittedAt: now,
                }

                saveDuplicateCache(
                    cache.map((entry) => {
                        if (entry.email === duplicateEntry.email && entry.message === duplicateEntry.message) {
                            return updatedEntry
                        }
                        return entry
                    })
                )

                try {
                    const payload = {
                        ...formData,
                        email: normalizedEmail,
                        message: normalizedMessage,
                        priority: incomingPriority,
                    }

                    const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/request`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    })

                    if (res.ok) {
                        const DATA = await res.json()
                        console.log(DATA)
                        setSubmissionMessage('Higher-priority duplicate request submitted successfully.')
                        // setFormData({
                        //     name: '',
                        //     email: '',
                        //     message: '',
                        //     priority: 'Medium',
                        // })
                        return
                    }

                    setSubmissionMessage('Duplicate request with higher priority was queued, but the server rejected it.')
                    return
                } catch (error) {
                    console.log(error)
                    setSubmissionMessage('Something went wrong while submitting the higher-priority duplicate request.')
                    return
                }
            }

            setSubmissionMessage('Duplicate request prevented within the last 60 seconds.')
            return
        }

        const newEntry: DuplicateEntry = {
            email: normalizedEmail,
            message: normalizedMessage,
            priority: incomingPriority,
            submittedAt: now,
        }

        saveDuplicateCache([...cache, newEntry])

        try {
            const payload = { ...formData, email: normalizedEmail, message: normalizedMessage, priority: incomingPriority }

            const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/request`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const DATA = await res.json()
                console.log(DATA)
                setSubmissionMessage('Request submitted successfully.')
                setFormData({
                    name: '',
                    email: '',
                    message: '',
                    priority: 'Medium',
                })
            } else {
                setSubmissionMessage('Request could not be submitted. Please try again.')
            }
        } catch (error) {
            console.log(error)
            setSubmissionMessage('Something went wrong while submitting the request.')
        }
    }
    return (
        <>
            <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-800">
                <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
                    <div className="mb-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600">
                            Support Center
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                            Submit a support request
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={handleFillSampleCase}
                        className="mb-5 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                    >
                        Use sample complaint case
                    </button>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Your name"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-700">
                                Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                rows={5}
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="Describe your issue or request"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                required
                            />
                        </div>

                        <fieldset>
                            <legend className="mb-2 block text-sm font-medium text-slate-700">Priority</legend>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'Low', label: 'Low', accent: 'text-emerald-600' },
                                    { value: 'Medium', label: 'Medium', accent: 'text-amber-600' },
                                    { value: 'High', label: 'High', accent: 'text-rose-600' },
                                ].map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                                    >
                                        <input
                                            type="radio"
                                            name="priority"
                                            value={option.value}
                                            checked={formData.priority === option.value}
                                            onChange={handleChange}
                                            className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className={option.accent}>{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        {submissionMessage && (
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                                {submissionMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                        >
                            Send request
                        </button>
                    </form>
                </div>
            </main>
        </>
    )
}

export default Form
