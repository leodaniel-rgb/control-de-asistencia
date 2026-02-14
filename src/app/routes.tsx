import { createBrowserRouter } from "react-router";
import { Login } from "./components/Login";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { LoadingScreen } from "./components/LoadingScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoadingScreen,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/teacher",
    Component: TeacherDashboard,
  },
  {
    path: "/admin",
    Component: AdminDashboard,
  },
]);
