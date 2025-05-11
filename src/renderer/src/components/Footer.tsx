import { useSidebar } from '../context/SidebarContext'

export default function Footer() {
  const { collapsed } = useSidebar()

  return (
    <footer className={`mt-auto py-4 flex flex-col text-center text-gray-400 text-sm ${collapsed ? 'ml-16' : 'ml-60'} transition-all duration-300`}>
      <div>Novainit Studio @ OwlStater © 2025 - {new Date().getFullYear()}</div>
      <div>OwlStater 不隸屬或認可於 Mojang AB、Microsoft 或 Minecraft。</div>
    </footer>
  )
}
