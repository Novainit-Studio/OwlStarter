import { useSidebar } from '../context/SidebarContext'

export default function Footer() {
  const { collapsed } = useSidebar()

  return (
    <footer className={`mt-auto py-4 px-6 flex flex-col text-center text-slate-400 text-xs ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
      <div className="tracking-wide">Novainit Studio @ OwlStarter © 2025 - {new Date().getFullYear()}</div>
      <div>OwlStarter 不隸屬或認可於 Mojang AB、Microsoft 或 Minecraft。</div>
    </footer>
  )
}
