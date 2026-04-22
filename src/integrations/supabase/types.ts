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
      account_deletions: {
        Row: {
          deleted_at: string
          email: string | null
          id: string
          initiated_by: string
          reason: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          email?: string | null
          id?: string
          initiated_by?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          email?: string | null
          id?: string
          initiated_by?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          edit_members: boolean
          edit_settings: boolean
          export_data: boolean
          id: string
          invite_remove_admins: boolean
          manage_marketing: boolean
          manage_meal_plans: boolean
          manage_recipes: boolean
          manage_special_meals: boolean
          updated_at: string
          user_id: string
          view_analytics: boolean
          view_members: boolean
          view_snap_data: boolean
        }
        Insert: {
          created_at?: string
          edit_members?: boolean
          edit_settings?: boolean
          export_data?: boolean
          id?: string
          invite_remove_admins?: boolean
          manage_marketing?: boolean
          manage_meal_plans?: boolean
          manage_recipes?: boolean
          manage_special_meals?: boolean
          updated_at?: string
          user_id: string
          view_analytics?: boolean
          view_members?: boolean
          view_snap_data?: boolean
        }
        Update: {
          created_at?: string
          edit_members?: boolean
          edit_settings?: boolean
          export_data?: boolean
          id?: string
          invite_remove_admins?: boolean
          manage_marketing?: boolean
          manage_meal_plans?: boolean
          manage_recipes?: boolean
          manage_special_meals?: boolean
          updated_at?: string
          user_id?: string
          view_analytics?: boolean
          view_members?: boolean
          view_snap_data?: boolean
        }
        Relationships: []
      }
      bls_regional_cpi_cache: {
        Row: {
          cached_at: string
          id: string
          last_cpi_value: number | null
          multiplier: number
          national_avg_cpi: number | null
          region: string
          region_code: string
        }
        Insert: {
          cached_at?: string
          id?: string
          last_cpi_value?: number | null
          multiplier?: number
          national_avg_cpi?: number | null
          region: string
          region_code: string
        }
        Update: {
          cached_at?: string
          id?: string
          last_cpi_value?: number | null
          multiplier?: number
          national_avg_cpi?: number | null
          region?: string
          region_code?: string
        }
        Relationships: []
      }
      canonical_product_aliases: {
        Row: {
          alias_id: string
          alias_text: string
          alias_type: string | null
          canonical_product_id: string
          created_at: string
        }
        Insert: {
          alias_id?: string
          alias_text: string
          alias_type?: string | null
          canonical_product_id: string
          created_at?: string
        }
        Update: {
          alias_id?: string
          alias_text?: string
          alias_type?: string | null
          canonical_product_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_product_aliases_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["canonical_product_id"]
          },
        ]
      }
      canonical_products: {
        Row: {
          canonical_brand: string | null
          canonical_name: string
          canonical_product_id: string
          category: string | null
          created_at: string
          default_image_url: string | null
          default_price: number | null
          default_unit: string | null
          gtin_upc: string | null
          ingredient_type: string | null
          is_generic: boolean
          normalized_size_text: string | null
          nutrition_reference_id: string | null
          nutrition_source: string | null
          size_unit: string | null
          size_value: number | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          canonical_brand?: string | null
          canonical_name: string
          canonical_product_id?: string
          category?: string | null
          created_at?: string
          default_image_url?: string | null
          default_price?: number | null
          default_unit?: string | null
          gtin_upc?: string | null
          ingredient_type?: string | null
          is_generic?: boolean
          normalized_size_text?: string | null
          nutrition_reference_id?: string | null
          nutrition_source?: string | null
          size_unit?: string | null
          size_value?: number | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          canonical_brand?: string | null
          canonical_name?: string
          canonical_product_id?: string
          category?: string | null
          created_at?: string
          default_image_url?: string | null
          default_price?: number | null
          default_unit?: string | null
          gtin_upc?: string | null
          ingredient_type?: string | null
          is_generic?: boolean
          normalized_size_text?: string | null
          nutrition_reference_id?: string | null
          nutrition_source?: string | null
          size_unit?: string | null
          size_value?: number | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
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
      google_shopping_cache: {
        Row: {
          cached_at: string
          id: string
          item_name: string
          results: Json
          zip_code: string
        }
        Insert: {
          cached_at?: string
          id?: string
          item_name: string
          results?: Json
          zip_code: string
        }
        Update: {
          cached_at?: string
          id?: string
          item_name?: string
          results?: Json
          zip_code?: string
        }
        Relationships: []
      }
      grocery_cost_comparisons: {
        Row: {
          actual_grocery_cost: number
          confidence_score: number | null
          created_at: string
          estimated_savings: number
          id: string
          meal_plan_id: string | null
          regional_average_cost: number
          selected_store: string | null
          store_comparisons: Json | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          actual_grocery_cost?: number
          confidence_score?: number | null
          created_at?: string
          estimated_savings?: number
          id?: string
          meal_plan_id?: string | null
          regional_average_cost?: number
          selected_store?: string | null
          store_comparisons?: Json | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          actual_grocery_cost?: number
          confidence_score?: number | null
          created_at?: string
          estimated_savings?: number
          id?: string
          meal_plan_id?: string | null
          regional_average_cost?: number
          selected_store?: string | null
          store_comparisons?: Json | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_cost_comparisons_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
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
      household_store_preferences: {
        Row: {
          address_line_1: string | null
          city: string | null
          created_at: string
          household_id: string
          household_store_preference_id: string
          latitude: number | null
          longitude: number | null
          preferred_retailer_id: string | null
          preferred_store_id: string | null
          primary_store_flag: boolean
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address_line_1?: string | null
          city?: string | null
          created_at?: string
          household_id: string
          household_store_preference_id?: string
          latitude?: number | null
          longitude?: number | null
          preferred_retailer_id?: string | null
          preferred_store_id?: string | null
          primary_store_flag?: boolean
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address_line_1?: string | null
          city?: string | null
          created_at?: string
          household_id?: string
          household_store_preference_id?: string
          latitude?: number | null
          longitude?: number | null
          preferred_retailer_id?: string | null
          preferred_store_id?: string | null
          primary_store_flag?: boolean
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_store_preferences_preferred_retailer_id_fkey"
            columns: ["preferred_retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["retailer_id"]
          },
          {
            foreignKeyName: "household_store_preferences_preferred_store_id_fkey"
            columns: ["preferred_store_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["store_id"]
          },
        ]
      }
      ingredient_product_mapping: {
        Row: {
          canonical_product_id: string | null
          created_at: string
          ingredient_mapping_id: string
          manual_override: boolean
          mapping_confidence: string | null
          mapping_method: string | null
          preferred_retailer_product_id: string | null
          recipe_ingredient_text: string
          updated_at: string
        }
        Insert: {
          canonical_product_id?: string | null
          created_at?: string
          ingredient_mapping_id?: string
          manual_override?: boolean
          mapping_confidence?: string | null
          mapping_method?: string | null
          preferred_retailer_product_id?: string | null
          recipe_ingredient_text: string
          updated_at?: string
        }
        Update: {
          canonical_product_id?: string | null
          created_at?: string
          ingredient_mapping_id?: string
          manual_override?: boolean
          mapping_confidence?: string | null
          mapping_method?: string | null
          preferred_retailer_product_id?: string | null
          recipe_ingredient_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_product_mapping_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["canonical_product_id"]
          },
          {
            foreignKeyName: "ingredient_product_mapping_preferred_retailer_product_id_fkey"
            columns: ["preferred_retailer_product_id"]
            isOneToOne: false
            referencedRelation: "retailer_products"
            referencedColumns: ["retailer_product_id"]
          },
        ]
      }
      ingredients: {
        Row: {
          calories: number | null
          carbs_g: number | null
          category: string | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          ingredient_id: string
          ingredient_name: string
          protein_g: number | null
          serving_size: string | null
          serving_size_grams: number | null
          updated_at: string
          usda_description: string | null
          usda_food_id: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          ingredient_id?: string
          ingredient_name: string
          protein_g?: number | null
          serving_size?: string | null
          serving_size_grams?: number | null
          updated_at?: string
          usda_description?: string | null
          usda_food_id?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          ingredient_id?: string
          ingredient_name?: string
          protein_g?: number | null
          serving_size?: string | null
          serving_size_grams?: number | null
          updated_at?: string
          usda_description?: string | null
          usda_food_id?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          notes: string | null
          platform: string | null
          publish_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          platform?: string | null
          publish_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          platform?: string | null
          publish_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          plan_data: Json | null
          status: string | null
          total_estimated_cost: number | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_data?: Json | null
          status?: string | null
          total_estimated_cost?: number | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_data?: Json | null
          status?: string | null
          total_estimated_cost?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      national_food_prices: {
        Row: {
          id: string
          ingredient_id: string
          last_updated: string
          national_avg_price: number
          source: string | null
          unit: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          last_updated?: string
          national_avg_price: number
          source?: string | null
          unit: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          last_updated?: string
          national_avg_price?: number
          source?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "national_food_prices_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["ingredient_id"]
          },
        ]
      }
      open_food_facts_cache: {
        Row: {
          brand: string | null
          cached_at: string
          calories: number | null
          carbs: number | null
          fat: number | null
          id: string
          image: string | null
          item_name: string
          product_name: string | null
          protein: number | null
        }
        Insert: {
          brand?: string | null
          cached_at?: string
          calories?: number | null
          carbs?: number | null
          fat?: number | null
          id?: string
          image?: string | null
          item_name: string
          product_name?: string | null
          protein?: number | null
        }
        Update: {
          brand?: string | null
          cached_at?: string
          calories?: number | null
          carbs?: number | null
          fat?: number | null
          id?: string
          image?: string | null
          item_name?: string
          product_name?: string | null
          protein?: number | null
        }
        Relationships: []
      }
      open_prices_cache: {
        Row: {
          cached_at: string
          city: string | null
          currency: string | null
          id: string
          item_name: string
          price: number | null
          product_name: string | null
          store: string | null
          submitted_date: string | null
        }
        Insert: {
          cached_at?: string
          city?: string | null
          currency?: string | null
          id?: string
          item_name: string
          price?: number | null
          product_name?: string | null
          store?: string | null
          submitted_date?: string | null
        }
        Update: {
          cached_at?: string
          city?: string | null
          currency?: string | null
          id?: string
          item_name?: string
          price?: number | null
          product_name?: string | null
          store?: string | null
          submitted_date?: string | null
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
          is_out_of_stock: boolean | null
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
          is_out_of_stock?: boolean | null
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
          is_out_of_stock?: boolean | null
          item_name?: string
          quantity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_price_history: {
        Row: {
          freshness_status: string | null
          observed_at: string
          observed_price: number
          observed_sale_price: number | null
          price_history_id: string
          raw_source_payload: Json | null
          retailer_product_id: string
          source_system: string
          store_id: string | null
        }
        Insert: {
          freshness_status?: string | null
          observed_at?: string
          observed_price: number
          observed_sale_price?: number | null
          price_history_id?: string
          raw_source_payload?: Json | null
          retailer_product_id: string
          source_system: string
          store_id?: string | null
        }
        Update: {
          freshness_status?: string | null
          observed_at?: string
          observed_price?: number
          observed_sale_price?: number | null
          price_history_id?: string
          raw_source_payload?: Json | null
          retailer_product_id?: string
          source_system?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_retailer_product_id_fkey"
            columns: ["retailer_product_id"]
            isOneToOne: false
            referencedRelation: "retailer_products"
            referencedColumns: ["retailer_product_id"]
          },
          {
            foreignKeyName: "product_price_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["store_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string | null
          allergies: string[] | null
          analytics_opt_in: boolean
          beta_user: boolean
          children_ages: string[] | null
          city: string | null
          cooking_confidence: string | null
          cooking_style: string | null
          cooking_time_preference: string | null
          created_at: string
          data_usage_opt_in: boolean
          dietary_preferences: string[] | null
          display_name: string | null
          eligibility_category: string | null
          email: string | null
          food_assistance_status: string | null
          food_preferences: string[] | null
          home_store: string | null
          household_size: number | null
          id: string
          infant_formula: boolean | null
          kitchen_equipment: string[] | null
          last_active: string | null
          latitude: number | null
          longitude: number | null
          meal_repetition: string | null
          membership_discount: number | null
          membership_tier: string | null
          monthly_snap_amount: number | null
          onboarding_completed_at: string | null
          phone_number: string | null
          preferred_stores: string[] | null
          questionnaire_completed: boolean | null
          referral_source: string | null
          show_snap_tracker: boolean
          snap_deposit_day: number | null
          snap_status: boolean | null
          state: string | null
          tier: string
          updated_at: string
          user_goals: string[] | null
          user_id: string
          user_type: string | null
          verification_badge: string | null
          verification_status: string | null
          verification_verified_at: string | null
          weekly_budget: number | null
          zip_code: string | null
        }
        Insert: {
          account_status?: string | null
          allergies?: string[] | null
          analytics_opt_in?: boolean
          beta_user?: boolean
          children_ages?: string[] | null
          city?: string | null
          cooking_confidence?: string | null
          cooking_style?: string | null
          cooking_time_preference?: string | null
          created_at?: string
          data_usage_opt_in?: boolean
          dietary_preferences?: string[] | null
          display_name?: string | null
          eligibility_category?: string | null
          email?: string | null
          food_assistance_status?: string | null
          food_preferences?: string[] | null
          home_store?: string | null
          household_size?: number | null
          id?: string
          infant_formula?: boolean | null
          kitchen_equipment?: string[] | null
          last_active?: string | null
          latitude?: number | null
          longitude?: number | null
          meal_repetition?: string | null
          membership_discount?: number | null
          membership_tier?: string | null
          monthly_snap_amount?: number | null
          onboarding_completed_at?: string | null
          phone_number?: string | null
          preferred_stores?: string[] | null
          questionnaire_completed?: boolean | null
          referral_source?: string | null
          show_snap_tracker?: boolean
          snap_deposit_day?: number | null
          snap_status?: boolean | null
          state?: string | null
          tier?: string
          updated_at?: string
          user_goals?: string[] | null
          user_id: string
          user_type?: string | null
          verification_badge?: string | null
          verification_status?: string | null
          verification_verified_at?: string | null
          weekly_budget?: number | null
          zip_code?: string | null
        }
        Update: {
          account_status?: string | null
          allergies?: string[] | null
          analytics_opt_in?: boolean
          beta_user?: boolean
          children_ages?: string[] | null
          city?: string | null
          cooking_confidence?: string | null
          cooking_style?: string | null
          cooking_time_preference?: string | null
          created_at?: string
          data_usage_opt_in?: boolean
          dietary_preferences?: string[] | null
          display_name?: string | null
          eligibility_category?: string | null
          email?: string | null
          food_assistance_status?: string | null
          food_preferences?: string[] | null
          home_store?: string | null
          household_size?: number | null
          id?: string
          infant_formula?: boolean | null
          kitchen_equipment?: string[] | null
          last_active?: string | null
          latitude?: number | null
          longitude?: number | null
          meal_repetition?: string | null
          membership_discount?: number | null
          membership_tier?: string | null
          monthly_snap_amount?: number | null
          onboarding_completed_at?: string | null
          phone_number?: string | null
          preferred_stores?: string[] | null
          questionnaire_completed?: boolean | null
          referral_source?: string | null
          show_snap_tracker?: boolean
          snap_deposit_day?: number | null
          snap_status?: boolean | null
          state?: string | null
          tier?: string
          updated_at?: string
          user_goals?: string[] | null
          user_id?: string
          user_type?: string | null
          verification_badge?: string | null
          verification_status?: string | null
          verification_verified_at?: string | null
          weekly_budget?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      provider_sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          provider_name: string
          records_created: number | null
          records_failed: number | null
          records_updated: number | null
          request_reference: string | null
          request_status: string
          retailer_id: string | null
          started_at: string
          store_id: string | null
          sync_log_id: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          provider_name: string
          records_created?: number | null
          records_failed?: number | null
          records_updated?: number | null
          request_reference?: string | null
          request_status?: string
          retailer_id?: string | null
          started_at?: string
          store_id?: string | null
          sync_log_id?: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          provider_name?: string
          records_created?: number | null
          records_failed?: number | null
          records_updated?: number | null
          request_reference?: string | null
          request_status?: string
          retailer_id?: string | null
          started_at?: string
          store_id?: string | null
          sync_log_id?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_sync_logs_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["retailer_id"]
          },
          {
            foreignKeyName: "provider_sync_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["store_id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          display_text: string | null
          id: string
          ingredient_id: string
          quantity: number | null
          recipe_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          display_text?: string | null
          id?: string
          ingredient_id: string
          quantity?: number | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          display_text?: string | null
          id?: string
          ingredient_id?: string
          quantity?: number | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
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
          fiber_g: number | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json
          is_public: boolean | null
          prep_time_minutes: number | null
          protein_g: number | null
          serving_size: number | null
          tags: string[]
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
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_public?: boolean | null
          prep_time_minutes?: number | null
          protein_g?: number | null
          serving_size?: number | null
          tags?: string[]
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
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_public?: boolean | null
          prep_time_minutes?: number | null
          protein_g?: number | null
          serving_size?: number | null
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      regional_food_prices: {
        Row: {
          average_price: number
          id: string
          ingredient_id: string
          last_updated: string
          region: string
          source: string | null
          unit: string
        }
        Insert: {
          average_price: number
          id?: string
          ingredient_id: string
          last_updated?: string
          region: string
          source?: string | null
          unit: string
        }
        Update: {
          average_price?: number
          id?: string
          ingredient_id?: string
          last_updated?: string
          region?: string
          source?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_food_prices_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["ingredient_id"]
          },
        ]
      }
      retailer_products: {
        Row: {
          active_status: string
          canonical_product_id: string | null
          created_at: string
          gtin_upc: string | null
          image_url: string | null
          package_size_text: string | null
          product_url: string | null
          provider_name: string | null
          provider_product_reference: string | null
          retailer_brand: string | null
          retailer_category: string | null
          retailer_id: string
          retailer_product_id: string
          retailer_product_title: string
          retailer_sku: string | null
          size_unit: string | null
          size_value: number | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          active_status?: string
          canonical_product_id?: string | null
          created_at?: string
          gtin_upc?: string | null
          image_url?: string | null
          package_size_text?: string | null
          product_url?: string | null
          provider_name?: string | null
          provider_product_reference?: string | null
          retailer_brand?: string | null
          retailer_category?: string | null
          retailer_id: string
          retailer_product_id?: string
          retailer_product_title: string
          retailer_sku?: string | null
          size_unit?: string | null
          size_value?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          active_status?: string
          canonical_product_id?: string | null
          created_at?: string
          gtin_upc?: string | null
          image_url?: string | null
          package_size_text?: string | null
          product_url?: string | null
          provider_name?: string | null
          provider_product_reference?: string | null
          retailer_brand?: string | null
          retailer_category?: string | null
          retailer_id?: string
          retailer_product_id?: string
          retailer_product_title?: string
          retailer_sku?: string | null
          size_unit?: string | null
          size_value?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retailer_products_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["canonical_product_id"]
          },
          {
            foreignKeyName: "retailer_products_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["retailer_id"]
          },
          {
            foreignKeyName: "retailer_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["store_id"]
          },
        ]
      }
      retailers: {
        Row: {
          created_at: string
          provider_name: string | null
          provider_retailer_reference: string | null
          retailer_id: string
          retailer_logo_url: string | null
          retailer_name: string
          retailer_slug: string
          retailer_status: string
          supports_live_inventory: boolean
          supports_live_pricing: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          provider_name?: string | null
          provider_retailer_reference?: string | null
          retailer_id?: string
          retailer_logo_url?: string | null
          retailer_name: string
          retailer_slug: string
          retailer_status?: string
          supports_live_inventory?: boolean
          supports_live_pricing?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          provider_name?: string | null
          provider_retailer_reference?: string | null
          retailer_id?: string
          retailer_logo_url?: string | null
          retailer_name?: string
          retailer_slug?: string
          retailer_status?: string
          supports_live_inventory?: boolean
          supports_live_pricing?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      serpapi_usage: {
        Row: {
          call_count: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          call_count?: number
          updated_at?: string
          usage_date: string
        }
        Update: {
          call_count?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      special_meal_collection_recipes: {
        Row: {
          collection_id: string
          id: string
          recipe_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          id?: string
          recipe_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          id?: string
          recipe_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "special_meal_collection_recipes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "special_meal_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_meal_collection_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      special_meal_collections: {
        Row: {
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_budget: number | null
          id: string
          is_featured: boolean
          publish_end_date: string | null
          publish_start_date: string | null
          publish_status: string
          seasonal_tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_budget?: number | null
          id?: string
          is_featured?: boolean
          publish_end_date?: string | null
          publish_start_date?: string | null
          publish_status?: string
          seasonal_tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_budget?: number | null
          id?: string
          is_featured?: boolean
          publish_end_date?: string | null
          publish_start_date?: string | null
          publish_status?: string
          seasonal_tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      state_tax_rules: {
        Row: {
          grocery_tax_rate: number
          local_tax_possible: boolean
          notes: string | null
          state: string
          state_name: string
          updated_at: string
        }
        Insert: {
          grocery_tax_rate?: number
          local_tax_possible?: boolean
          notes?: string | null
          state: string
          state_name: string
          updated_at?: string
        }
        Update: {
          grocery_tax_rate?: number
          local_tax_possible?: boolean
          notes?: string | null
          state?: string
          state_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_locations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          created_at: string
          latitude: number | null
          longitude: number | null
          phone_number: string | null
          provider_store_reference: string | null
          retailer_id: string
          state: string | null
          store_id: string
          store_name: string
          store_status: string
          timezone: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          latitude?: number | null
          longitude?: number | null
          phone_number?: string | null
          provider_store_reference?: string | null
          retailer_id: string
          state?: string | null
          store_id?: string
          store_name: string
          store_status?: string
          timezone?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          latitude?: number | null
          longitude?: number | null
          phone_number?: string | null
          provider_store_reference?: string | null
          retailer_id?: string
          state?: string | null
          store_id?: string
          store_name?: string
          store_status?: string
          timezone?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_locations_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["retailer_id"]
          },
        ]
      }
      store_product_prices: {
        Row: {
          base_price: number
          created_at: string
          currency_code: string
          freshness_status: string
          in_stock: boolean | null
          inventory_status: string | null
          last_verified_at: string
          loyalty_price: number | null
          promo_text: string | null
          raw_source_payload: Json | null
          retailer_id: string
          retailer_product_id: string
          sale_price: number | null
          source_confidence: string | null
          source_system: string
          store_id: string | null
          store_price_id: string
          unit_price: number | null
          unit_price_basis: string | null
          updated_at: string
          zip_code_context: string | null
        }
        Insert: {
          base_price: number
          created_at?: string
          currency_code?: string
          freshness_status?: string
          in_stock?: boolean | null
          inventory_status?: string | null
          last_verified_at?: string
          loyalty_price?: number | null
          promo_text?: string | null
          raw_source_payload?: Json | null
          retailer_id: string
          retailer_product_id: string
          sale_price?: number | null
          source_confidence?: string | null
          source_system: string
          store_id?: string | null
          store_price_id?: string
          unit_price?: number | null
          unit_price_basis?: string | null
          updated_at?: string
          zip_code_context?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string
          currency_code?: string
          freshness_status?: string
          in_stock?: boolean | null
          inventory_status?: string | null
          last_verified_at?: string
          loyalty_price?: number | null
          promo_text?: string | null
          raw_source_payload?: Json | null
          retailer_id?: string
          retailer_product_id?: string
          sale_price?: number | null
          source_confidence?: string | null
          source_system?: string
          store_id?: string | null
          store_price_id?: string
          unit_price?: number | null
          unit_price_basis?: string | null
          updated_at?: string
          zip_code_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_product_prices_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["retailer_id"]
          },
          {
            foreignKeyName: "store_product_prices_retailer_product_id_fkey"
            columns: ["retailer_product_id"]
            isOneToOne: false
            referencedRelation: "retailer_products"
            referencedColumns: ["retailer_product_id"]
          },
          {
            foreignKeyName: "store_product_prices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["store_id"]
          },
        ]
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          feedback_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          feedback_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          feedback_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_type: string
          document_url: string
          eligibility_category: string
          file_name: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_type: string
          document_url: string
          eligibility_category: string
          file_name: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_type?: string
          document_url?: string
          eligibility_category?: string
          file_name?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      walmart_price_cache: {
        Row: {
          cached_at: string
          id: string
          image: string | null
          in_stock: boolean | null
          item_name: string
          price: number | null
          title: string | null
          zip_code: string
        }
        Insert: {
          cached_at?: string
          id?: string
          image?: string | null
          in_stock?: boolean | null
          item_name: string
          price?: number | null
          title?: string | null
          zip_code: string
        }
        Update: {
          cached_at?: string
          id?: string
          image?: string | null
          in_stock?: boolean | null
          item_name?: string
          price?: number | null
          title?: string | null
          zip_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "content_manager" | "moderator"
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
    Enums: {
      app_role: ["owner", "admin", "content_manager", "moderator"],
    },
  },
} as const
