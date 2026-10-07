import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const RoleContext = createContext({
  personas: [],
  persona: null,
  setPersonaId: () => {},
  userId: null,
})

const STORAGE_KEY = 'pipeline_persona_id'

export function RoleProvider({ children }) {
  const [personas, setPersonas] = useState([])
  const [personaId, setPersonaIdState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? Number(saved) : null
  })

  useEffect(() => {
    api
      .getPersonas()
      .then((data) => {
        setPersonas(data.personas || [])
        if (!personaId && data.default_user_id) {
          setPersonaIdState(data.default_user_id)
          localStorage.setItem(STORAGE_KEY, String(data.default_user_id))
        }
      })
      .catch(() => {})
  }, [])

  function setPersonaId(id) {
    const num = Number(id)
    setPersonaIdState(num)
    localStorage.setItem(STORAGE_KEY, String(num))
  }

  const persona = useMemo(
    () => personas.find((p) => p.id === personaId) || null,
    [personas, personaId],
  )

  const value = useMemo(
    () => ({
      personas,
      persona,
      setPersonaId,
      userId: personaId,
    }),
    [personas, persona, personaId],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  return useContext(RoleContext)
}
