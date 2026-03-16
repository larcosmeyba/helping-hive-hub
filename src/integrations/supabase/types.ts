export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      food_waste_logs: {
        Row: {
          created_at: string
          had_waste: boolean
          id: string
          notes: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          had_waste: boolean
          id?: string
          notes?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          had_waste?: boolean
          id?: string
          notes?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      grocery_list_items: {
        Row: {
          created_at: string
          estimated_price: number | null
          grocery_list_id: string
          id: string
          ingredient_name: string
          is_checked: boolean | null
          quantity: string
          store_section: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_price?: number | null
          grocery_list_id: string
          id?: string
          ingredient_name: string
          is_checked?: boolean | null
          quantity: string
          store_section?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_price?: number | null
          grocery_list_id?: string
          id?: string
          ingredient_name?: string
          is_checked?: boolean | null
          quantity?: string
          store_section?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_grocery_list_id_fkey"
            columns: ["grocery_list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_lists: {
        Row: {
          created_at: string
          estimated_total: number | null
          id: string
          meal_plan_id: string | null
          status: string | null
          store_name: string | null
          tax_rate: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_total?: number | null
          id?: string
          meal_plan_id?: string | null
          status?: string | null
          store_name?: string | null
          tax_rate?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_total?: number | null
          id?: string
          meal_plan_id?: string | null
          status?: string | null
          store_name?: string | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_lists_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_items: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          day_of_week: number
          estimated_cost: number | null
          fats_g: number | null
          id: string
          meal_image: string | null
          meal_name: string
          meal_plan_id: string
          meal_type: string
          protein_g: number | null
          recipe_id: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          day_of_week: number
          estimated_cost?: number | null
          fats_g?: number | null
          id?: string
          meal_image?: string | null
          meal_name: string
          meal_plan_id: string
          meal_type: string
          protein_g?: number | null
          recipe_id?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          day_of_week?: number
          estimated_cost?: number | null
          fats_g?: number | null
          id?: string
          meal_image?: string | null
          meal_name?: string
          meal_plan_id?: string
          meal_type?: string
          protein_g?: number | null
          recipe_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          id: string
          status: string | null
          total_estimated_cost: number | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string | null
          total_estimated_cost?: number | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string | null
          total_estimated_cost?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          category: string | null
          created_at: string
          expiration_date: string | null
          id: string
          is_low_stock: boolean | null
          item_name: string
          quantity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          is_low_stock?: boolean | null
          item_name: string
          quantity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          is_low_stock?: boolean | null
          item_name?: string
          quantity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allergies: string[] | null
          cooking_time_preference: string | null
          created_at: string
          dietary_preferences: string[] | null
          display_name: string | null
          email: string | null
          household_size: number | null
          id: string
          preferred_stores: string[] | null
          questionnaire_completed: boolean | null
          updated_at: string
          user_id: string
          weekly_budget: number | null
          zip_code: string | null
        }
        Insert: {
          allergies?: string[] | null
          cooking_time_preference?: string | null
          created_at?: string
          dietary_preferences?: string[] | null
          display_name?: string | null
          email?: string | null
          household_size?: number | null
          id?: string
          preferred_stores?: string[] | null
          questionnaire_completed?: boolean | null
          updated_at?: string
          user_id: string
          weekly_budget?: number | null
          zip_code?: string | null
        }
        Update: {
          allergies?: string[] | null
          cooking_time_preference?: string | null
          created_at?: string
          dietary_preferences?: string[] | null
          display_name?: string | null
          email?: string | null
          household_size?: number | null
          id?: string
          preferred_stores?: string[] | null
          questionnaire_completed?: boolean | null
          updated_at?: string
          user_id?: string
          weekly_budget?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          calories: number | null
          carbs_g: number | null
          category: string | null
          cook_time_minutes: number | null
          cost_estimate: number | null
          created_at: string
          description: string | null
          fats_g: number | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json
          is_public: boolean | null
          protein_g: number | null
          serving_size: number | null
          title: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          fats_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_public?: boolean | null
          protein_g?: number | null
          serving_size?: number | null
          title: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          fats_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_public?: boolean | null
          protein_g?: number | null
          serving_size?: number | null
          title?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string | null
          ticket_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          ticket_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          ticket_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
