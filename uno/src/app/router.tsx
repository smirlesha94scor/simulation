import { createBrowserRouter } from 'react-router-dom'
import { DesktopRoute, MobileRoute } from './DeviceRoutes'

export const router = createBrowserRouter([
  { path: '/', element: <DesktopRoute /> },
  { path: '/mobile', element: <MobileRoute /> },
], {
  basename: '/simulation', // <-- Добавляем этот объект с настройкой
})
