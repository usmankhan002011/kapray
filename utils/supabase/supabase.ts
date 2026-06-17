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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      dress_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      fabric_types: {
        Row: {
          code: string
          created_at: string
          id: string
          image_path: string | null
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_auth_user_id: string | null
          buyer_email: string | null
          buyer_mobile: string
          buyer_name: string
          city: string
          country: string
          courier_name: string | null
          created_at: string
          currency: string
          delivery_address: string
          delivery_pkr: number | null
          destination_type: string
          discount_pkr: number | null
          exact_measurements: Json
          export_region: string | null
          id: number
          media_snapshot: Json
          notes: string | null
          order_no: string | null
          payment_ref: string | null
          postal_code: string | null
          price_snapshot: Json
          product_code_snapshot: string
          product_id: number | null
          selected_size: string | null
          size_mode: string
          spec_snapshot: Json
          status: string
          subtotal_pkr: number | null
          title_snapshot: string
          total_pkr: number | null
          tracking_number: string | null
          updated_at: string
          vendor_id: number
        }
        Insert: {
          buyer_auth_user_id?: string | null
          buyer_email?: string | null
          buyer_mobile: string
          buyer_name: string
          city: string
          country?: string
          courier_name?: string | null
          created_at?: string
          currency?: string
          delivery_address: string
          delivery_pkr?: number | null
          destination_type?: string
          discount_pkr?: number | null
          exact_measurements?: Json
          export_region?: string | null
          id?: number
          media_snapshot?: Json
          notes?: string | null
          order_no?: string | null
          payment_ref?: string | null
          postal_code?: string | null
          price_snapshot?: Json
          product_code_snapshot: string
          product_id?: number | null
          selected_size?: string | null
          size_mode?: string
          spec_snapshot?: Json
          status?: string
          subtotal_pkr?: number | null
          title_snapshot: string
          total_pkr?: number | null
          tracking_number?: string | null
          updated_at?: string
          vendor_id: number
        }
        Update: {
          buyer_auth_user_id?: string | null
          buyer_email?: string | null
          buyer_mobile?: string
          buyer_name?: string
          city?: string
          country?: string
          courier_name?: string | null
          created_at?: string
          currency?: string
          delivery_address?: string
          delivery_pkr?: number | null
          destination_type?: string
          discount_pkr?: number | null
          exact_measurements?: Json
          export_region?: string | null
          id?: number
          media_snapshot?: Json
          notes?: string | null
          order_no?: string | null
          payment_ref?: string | null
          postal_code?: string | null
          price_snapshot?: Json
          product_code_snapshot?: string
          product_id?: number | null
          selected_size?: string | null
          size_mode?: string
          spec_snapshot?: Json
          status?: string
          subtotal_pkr?: number | null
          title_snapshot?: string
          total_pkr?: number | null
          tracking_number?: string | null
          updated_at?: string
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      origin_cities: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      price_bands: {
        Row: {
          created_at: string
          id: string
          max_pkr: number | null
          min_pkr: number | null
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_pkr?: number | null
          min_pkr?: number | null
          name: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          max_pkr?: number | null
          min_pkr?: number | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      price_buckets: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          label: string
          max_pkr: number
          min_pkr: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          label: string
          max_pkr: number
          min_pkr: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          label?: string
          max_pkr?: number
          min_pkr?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          id: number
          inventory_qty: number
          made_on_order: boolean
          media: Json
          price: Json
          product_category: string
          product_code: string
          spec: Json
          title: string
          updated_at: string
          vendor_id: number
          vendor_seq: number
        }
        Insert: {
          created_at?: string
          id?: number
          inventory_qty?: number
          made_on_order?: boolean
          media?: Json
          price?: Json
          product_category?: string
          product_code: string
          spec?: Json
          title: string
          updated_at?: string
          vendor_id: number
          vendor_seq: number
        }
        Update: {
          created_at?: string
          id?: number
          inventory_qty?: number
          made_on_order?: boolean
          media?: Json
          price?: Json
          product_category?: string
          product_code?: string
          spec?: Json
          title?: string
          updated_at?: string
          vendor_id?: number
          vendor_seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_delete_queue: {
        Row: {
          bucket_id: string
          created_at: string
          error: string | null
          id: number
          object_path: string
          processed_at: string | null
          source_id: number | null
          source_table: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string
          error?: string | null
          id?: number
          object_path: string
          processed_at?: string | null
          source_id?: number | null
          source_table?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string
          error?: string | null
          id?: number
          object_path?: string
          processed_at?: string | null
          source_id?: number | null
          source_table?: string | null
        }
        Relationships: []
      }
      vendor: {
        Row: {
          address: string | null
          auth_user_id: string | null
          banner_path: string | null
          certificate_paths: string[] | null
          created_at: string
          email: string | null
          export_regions: Json
          exports_enabled: boolean
          id: number
          image: string | null
          landline: string | null
          location: string | null
          location_url: string | null
          mobile: string | null
          name: string
          offers_tailoring: boolean
          owner_user_id: string | null
          profile_image_path: string | null
          shop_image_paths: string[] | null
          shop_name: string | null
          shop_video_paths: string[] | null
          status: string | null
          tailoring_options: Json
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          banner_path?: string | null
          certificate_paths?: string[] | null
          created_at?: string
          email?: string | null
          export_regions?: Json
          exports_enabled?: boolean
          id?: number
          image?: string | null
          landline?: string | null
          location?: string | null
          location_url?: string | null
          mobile?: string | null
          name: string
          offers_tailoring?: boolean
          owner_user_id?: string | null
          profile_image_path?: string | null
          shop_image_paths?: string[] | null
          shop_name?: string | null
          shop_video_paths?: string[] | null
          status?: string | null
          tailoring_options?: Json
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          banner_path?: string | null
          certificate_paths?: string[] | null
          created_at?: string
          email?: string | null
          export_regions?: Json
          exports_enabled?: boolean
          id?: number
          image?: string | null
          landline?: string | null
          location?: string | null
          location_url?: string | null
          mobile?: string | null
          name?: string
          offers_tailoring?: boolean
          owner_user_id?: string | null
          profile_image_path?: string | null
          shop_image_paths?: string[] | null
          shop_name?: string | null
          shop_video_paths?: string[] | null
          status?: string | null
          tailoring_options?: Json
        }
        Relationships: []
      }
      vendor_reviews: {
        Row: {
          buyer_user_id: string
          comment: string | null
          created_at: string
          id: number
          is_hidden: boolean
          is_public: boolean
          is_verified_purchase: boolean
          order_id: number
          rating: number
          updated_at: string
          vendor_id: number
          vendor_reply: string | null
          vendor_reply_at: string | null
        }
        Insert: {
          buyer_user_id: string
          comment?: string | null
          created_at?: string
          id?: number
          is_hidden?: boolean
          is_public?: boolean
          is_verified_purchase?: boolean
          order_id: number
          rating: number
          updated_at?: string
          vendor_id: number
          vendor_reply?: string | null
          vendor_reply_at?: string | null
        }
        Update: {
          buyer_user_id?: string
          comment?: string | null
          created_at?: string
          id?: number
          is_hidden?: boolean
          is_public?: boolean
          is_verified_purchase?: boolean
          order_id?: number
          rating?: number
          updated_at?: string
          vendor_id?: number
          vendor_reply?: string | null
          vendor_reply_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reviews_order_vendor_match_fkey"
            columns: ["order_id", "vendor_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "vendor_id"]
          },
          {
            foreignKeyName: "vendor_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      wear_states: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      work_densities: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      work_types: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      vendor_review_summary: {
        Row: {
          average_rating: number | null
          rating_1_count: number | null
          rating_2_count: number | null
          rating_3_count: number | null
          rating_4_count: number | null
          rating_5_count: number | null
          review_count: number | null
          vendor_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_order_atomic_single_unit:
        | {
            Args: {
              p_buyer_auth_user_id: string
              p_buyer_email: string
              p_buyer_mobile: string
              p_buyer_name: string
              p_city: string
              p_currency: string
              p_delivery_address: string
              p_delivery_pkr: number
              p_discount_pkr: number
              p_exact_measurements: Json
              p_media_snapshot: Json
              p_notes: string
              p_price_snapshot: Json
              p_product_code_snapshot: string
              p_product_id: number
              p_selected_size: string
              p_size_mode: string
              p_spec_snapshot: Json
              p_subtotal_pkr: number
              p_title_snapshot: string
              p_total_pkr: number
            }
            Returns: {
              message: string
              ok: boolean
              order_id: number
            }[]
          }
        | {
            Args: {
              p_buyer_auth_user_id: string
              p_buyer_email: string
              p_buyer_mobile: string
              p_buyer_name: string
              p_city: string
              p_currency: string
              p_delivery_address: string
              p_delivery_pkr: number
              p_discount_pkr: number
              p_exact_measurements: Json
              p_media_snapshot: Json
              p_notes: string
              p_price_snapshot: Json
              p_product_code_snapshot: string
              p_product_id: number
              p_selected_size: string
              p_selected_variant_id?: string
              p_selected_variant_size?: string
              p_size_mode: string
              p_spec_snapshot: Json
              p_subtotal_pkr: number
              p_title_snapshot: string
              p_total_pkr: number
            }
            Returns: {
              message: string
              ok: boolean
              order_id: number
            }[]
          }
      next_vendor_product_seq: {
        Args: { p_vendor_id: number }
        Returns: number
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
