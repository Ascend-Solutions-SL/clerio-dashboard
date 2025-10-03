"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Home, AlertTriangle, Plug, Settings, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { 
    name: "Inicio", 
    icon: Home, 
    tab: "empresas"
  },
  { 
    name: "Integraciones", 
    icon: Plug, 
    tab: "integraciones"
  },
  { 
    name: "Incidencias", 
    icon: AlertTriangle, 
    tab: "incidencias"
  },
  { 
    name: "Config", 
    icon: Settings, 
    tab: "configuracion"
  },
]

interface UserData {
  userName: string;
  userInitials: string;
}

interface AuthUser {
  user_name: string;
  user_initials: string;
}

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentTab, setCurrentTab] = useState('empresas')
  const [userData, setUserData] = useState<UserData | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Error fetching user:', authError)
          return
        }
        
        if (user) {
          // Fetch user data from auth_users table
          const { data: authUserData, error: dbError } = await supabase
            .from('auth_users')
            .select('user_name, user_initials')
            .eq('user_uid', user.id)
            .single()
          
          if (dbError) {
            console.error('Error fetching user data from auth_users:', dbError)
            // Fallback to default values
            setUserData({
              userName: 'Usuario',
              userInitials: 'US'
            })
            return
          }
          
          if (authUserData) {
            setUserData({
              userName: authUserData.user_name || 'Usuario',
              userInitials: authUserData.user_initials || 'US'
            })
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }
    
    fetchUserData()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user data from auth_users table
        const { data: authUserData } = await supabase
          .from('auth_users')
          .select('user_name, user_initials')
          .eq('user_uid', session.user.id)
          .single()
        
        if (authUserData) {
          setUserData({
            userName: authUserData.user_name || 'Usuario',
            userInitials: authUserData.user_initials || 'US'
          })
        }
      } else if (event === 'SIGNED_OUT') {
        setUserData(null)
      }
    })
    
    return () => {
      subscription?.unsubscribe()
    }
  }, [])
  
  // Only run on client-side
  useEffect(() => {
    const updateTabFromUrl = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const urlTab = params.get('tab')
        if (urlTab) {
          setCurrentTab(urlTab)
        }
      }
    }
    
    // Initial update
    updateTabFromUrl()
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', updateTabFromUrl)
    
    return () => {
      window.removeEventListener('popstate', updateTabFromUrl)
    }
  }, [])

  const handleItemClick = (tab: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.pushState({}, '', url.toString())
      setCurrentTab(tab)
      // Trigger a custom event to notify other components
      window.dispatchEvent(new Event('tabchange'))
    }
  }

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r transition-all duration-300 z-50 flex flex-col",
        isExpanded ? "w-56" : "w-20"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        // Add a small delay before collapsing to prevent flickering
        setTimeout(() => {
          const isHovering = document.querySelector('.sidebar-hover-zone')?.matches(':hover');
          if (!isHovering) {
            setIsExpanded(false);
          }
        }, 100);
      }}
    >
      {/* Add an invisible hover zone to prevent premature collapse */}
      <div 
        className="sidebar-hover-zone absolute inset-y-0 right-0 w-4 -mr-4 z-50"
        onMouseEnter={() => setIsExpanded(true)}
      />
      
      {/* Header with logo */}
      <div 
        className="h-20 px-4 flex items-center" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center">
          {/* Logo container */}
          <div className="ml-0 h-11 w-11 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xl font-bold">
            C
          </div>
          
          {/* Text that only shows when expanded */}
          <span className={cn(
            "ml-3 text-xl font-semibold whitespace-nowrap transition-opacity duration-200",
            isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          )}>
            Clerio
          </span>
        </div>
      </div>
      
      {/* Navigation with flex-1 to take remaining space */}
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-3 px-4">
          {navItems.map((item) => {
            const isActive = currentTab === item.tab
            return (
              <li key={item.name} className="relative">
                <button
                  onClick={() => handleItemClick(item.tab)}
                  className={cn(
                    "flex items-center p-3 rounded-lg w-full transition-colors group text-left",
                    isActive ? "bg-[#2563eb] text-white" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span 
                    className={cn(
                      "ml-3 whitespace-nowrap transition-all duration-200 text-left w-40",
                      !isExpanded && "opacity-0 w-0 overflow-hidden"
                    )}
                  >
                    {item.name}
                  </span>
                </button>
                {!isExpanded && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.name}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
      
      {/* Logout button */}
      <div className="px-4 mb-2">
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          className={cn(
            "flex items-center p-3 rounded-lg w-full transition-colors group text-left text-gray-600 hover:bg-red-50 hover:text-red-600"
          )}
        >
          <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
            <LogOut className="h-5 w-5" />
          </div>
          <span className={cn(
            "ml-3 whitespace-nowrap transition-all duration-200 text-left w-40",
            !isExpanded ? "opacity-0 w-0" : "opacity-100"
          )}>
            Cerrar sesión
          </span>
        </button>
      </div>
      
      {/* User info */}
      <div className="p-5 pt-0">
        <div className="border-t pt-4">
        <div className={cn(
          "flex items-center",
          !isExpanded && "justify-start"
        )}>
          <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            {userData?.userInitials ? (
              <span className="text-bas font-medium">{userData.userInitials}</span>
            ) : (
              <User className="h-4 w-4 text-gray-600" />
            )}
          </div>
          <div className={cn(
            "ml-3 overflow-hidden transition-all duration-200",
            !isExpanded ? "opacity-0 w-0" : "opacity-100"
          )}>
            <p className="text-sm font-medium truncate">{userData?.userName || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">Administrador</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
