import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Questionnaire from "./pages/Questionnaire.tsx";
import SampleMealPlan from "./pages/SampleMealPlan.tsx";
import DashboardLayout from "./pages/dashboard/DashboardLayout.tsx";
import DashboardHome from "./pages/dashboard/DashboardHome.tsx";
import MealPlanPage from "./pages/dashboard/MealPlanPage.tsx";
import GroceryListPage from "./pages/dashboard/GroceryListPage.tsx";
import PantryPage from "./pages/dashboard/PantryPage.tsx";
import RecipesPage from "./pages/dashboard/RecipesPage.tsx";
import BudgetInsightsPage from "./pages/dashboard/BudgetInsightsPage.tsx";
import SettingsPage from "./pages/dashboard/SettingsPage.tsx";
import SupportPage from "./pages/dashboard/SupportPage.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminMembers from "./pages/admin/AdminMembers.tsx";
import AdminMealPlans from "./pages/admin/AdminMealPlans.tsx";
import AdminRecipes from "./pages/admin/AdminRecipes.tsx";
import AdminSpecialMeals from "./pages/admin/AdminSpecialMeals.tsx";
import AdminMarketing from "./pages/admin/AdminMarketing.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminManagement from "./pages/admin/AdminManagement.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sample-plan/:slug" element={<SampleMealPlan />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="meal-plan" element={<MealPlanPage />} />
              <Route path="grocery-list" element={<GroceryListPage />} />
              <Route path="pantry" element={<PantryPage />} />
              <Route path="recipes" element={<RecipesPage />} />
              <Route path="budget" element={<BudgetInsightsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="support" element={<SupportPage />} />
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="members" element={<AdminMembers />} />
              <Route path="meal-plans" element={<AdminMealPlans />} />
              <Route path="recipes" element={<AdminRecipes />} />
              <Route path="special-meals" element={<AdminSpecialMeals />} />
              <Route path="marketing" element={<AdminMarketing />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="admins" element={<AdminManagement />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
