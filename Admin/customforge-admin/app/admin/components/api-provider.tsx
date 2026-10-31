"use client"

import type React from "react"

import { createContext, useContext } from "react"
import { apiClient } from "@/lib/api-client"

interface ApiContextType {
  apiClient: typeof apiClient
}

export const ApiContext = createContext<ApiContextType | undefined>(undefined)

export function ApiProvider({ children }: { children: React.ReactNode }) {
  return <ApiContext.Provider value={{ apiClient }}>{children}</ApiContext.Provider>
}

export function useApiClient() {
  const context = useContext(ApiContext)
  if (!context) {
    throw new Error("useApiClient must be used within ApiProvider")
  }
  return context.apiClient
}
