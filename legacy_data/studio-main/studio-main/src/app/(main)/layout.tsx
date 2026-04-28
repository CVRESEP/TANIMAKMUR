
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  Store,
  FileText,
  User,
  Settings,
  Truck,
  ArrowRightLeft,
  Banknote,
  Wallet,
  Coins,
  FileClock,
  Menu,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/", label: "DASBOR", icon: LayoutDashboard },
  { href: "/products", label: "DAFTAR PRODUK", icon: Package },
  { href: "/kiosks", label: "DATA KIOS", icon: Store },
  { href: "/penebusan", label: "PENEBUSAN", icon: ArrowRightLeft },
  { href: "/pengeluaran-do", label: "PENGELUARAN DO", icon: FileText },
  { href: "/penyaluran-kios", label: "PENYALURAN KIOS", icon: Truck },
  { href: "/pembayaran", label: "PEMBAYARAN", icon: Banknote },
  { href: "/kas-umum", label: "KAS UMUM", icon: Wallet },
  { href: "/kas-angkutan", label: "KAS ANGKUTAN", icon: Coins },
  { href: "/laporan-harian", label: "LAPORAN HARIAN", icon: FileClock },
];

const AppHeader = () => {
    const { state } = useSidebar();
    return (
        <SidebarHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2 group-data-[state=expanded]:flex group-data-[state=collapsed]:hidden">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-600 text-white">
                    <span className="text-lg font-bold">TM</span>
                </div>
                <h1 className="text-xl font-semibold">TANI MAKMUR</h1>
            </div>
             <div className="items-center justify-center h-8 w-8 rounded-lg bg-red-600 text-white group-data-[state=collapsed]:flex group-data-[state=expanded]:hidden hidden md:flex">
                <span className="text-lg font-bold">TM</span>
            </div>
            <SidebarTrigger className="hidden md:flex" />
        </SidebarHeader>
    )
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar>
        <AppHeader />
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="md:hidden" />
            <div className="w-full flex-1">
                <h1 className="text-lg font-semibold md:text-2xl">
                    {navItems.find(item => item.href === pathname)?.label || 'DASBOR'}
                </h1>
            </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
