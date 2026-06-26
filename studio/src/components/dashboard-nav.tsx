
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dumbbell, Trophy, Dribbble } from "lucide-react"

import { cn } from "@/lib/utils"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "./ui/sidebar"

const links = [
  { href: "/dashboard/gym", label: "Gym", icon: Dumbbell },
  { href: "/dashboard/football", label: "Football", icon: Trophy },
  { href: "/dashboard/basketball", label: "Basketball", icon: Dribbble },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <Link href={link.href}>
            <SidebarMenuButton isActive={pathname === link.href}>
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
