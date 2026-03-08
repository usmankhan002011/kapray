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
      consumer: {
        Row: {
          address: string | null
          created_at: string
          id: number
          name: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: number
          name?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      dress_type: {
        Row: {
          created_at: string
          icon: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          icon: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: number
          name?: string
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
          courier_name: string | null
          created_at: string
          currency: string
          delivery_address: string
          delivery_pkr: number | null
          discount_pkr: number | null
          exact_measurements: Json
          id: number
          media_snapshot: Json
          notes: string | null
          order_no: string | null
          payment_ref: string | null
          price_snapshot: Json
          product_code_snapshot: string
          product_id: number
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
          courier_name?: string | null
          created_at?: string
          currency?: string
          delivery_address: string
          delivery_pkr?: number | null
          discount_pkr?: number | null
          exact_measurements?: Json
          id?: number
          media_snapshot?: Json
          notes?: string | null
          order_no?: string | null
          payment_ref?: string | null
          price_snapshot?: Json
          product_code_snapshot: string
          product_id: number
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
          courier_name?: string | null
          created_at?: string
          currency?: string
          delivery_address?: string
          delivery_pkr?: number | null
          discount_pkr?: number | null
          exact_measurements?: Json
          id?: number
          media_snapshot?: Json
          notes?: string | null
          order_no?: string | null
          payment_ref?: string | null
          price_snapshot?: Json
          product_code_snapshot?: string
          product_id?: number
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
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_with_image_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_with_media_paths"
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
      product: {
        Row: {
          created_at: string
          description: string | null
          dress_type: number | null
          id: number
          price: number | null
          title: string | null
          vendor: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          dress_type?: number | null
          id?: number
          price?: number | null
          title?: string | null
          vendor: number
        }
        Update: {
          created_at?: string
          description?: string | null
          dress_type?: number | null
          id?: number
          price?: number | null
          title?: string | null
          vendor?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_vendor_fkey"
            columns: ["vendor"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vendor_fkey"
            columns: ["vendor"]
            isOneToOne: false
            referencedRelation: "vendor_with_image_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vendor_fkey"
            columns: ["vendor"]
            isOneToOne: false
            referencedRelation: "vendor_with_media_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      product_photos: {
        Row: {
          created_at: string
          id: number
          photo: string | null
          product: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          photo?: string | null
          product?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          photo?: string | null
          product?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_photos_product_fkey"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_photos_product_fkey"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "product_with_photos"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_with_image_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_with_media_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      sale: {
        Row: {
          buyer: number | null
          created_at: string
          id: number
          product: number | null
        }
        Insert: {
          buyer?: number | null
          created_at?: string
          id?: number
          product?: number | null
        }
        Update: {
          buyer?: number | null
          created_at?: string
          id?: number
          product?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_buyer_fkey"
            columns: ["buyer"]
            isOneToOne: false
            referencedRelation: "consumer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_product_fkey"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_product_fkey"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "product_with_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor: {
        Row: {
          address: string | null
          auth_user_id: string | null
          banner_path: string | null
          certificate_paths: string[] | null
          created_at: string
          email: string | null
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
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          banner_path?: string | null
          certificate_paths?: string[] | null
          created_at?: string
          email?: string | null
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
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          banner_path?: string | null
          certificate_paths?: string[] | null
          created_at?: string
          email?: string | null
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
        }
        Relationships: []
      }
      vendor_product_counters: {
        Row: {
          last_seq: number
          updated_at: string
          vendor_id: number
        }
        Insert: {
          last_seq?: number
          updated_at?: string
          vendor_id: number
        }
        Update: {
          last_seq?: number
          updated_at?: string
          vendor_id?: number
        }
        Relationships: []
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
      dress_type_with_icon_path: {
        Row: {
          created_at: string | null
          icon: string | null
          icon_path: string | null
          id: number | null
          name: string | null
        }
        Relationships: []
      }
      product_photos_with_path: {
        Row: {
          created_at: string | null
          id: number | null
          object_path: string | null
          photo: string | null
          product: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_photos_product_fkey"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_photos_product_fkey"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "product_with_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      product_with_photos: {
        Row: {
          created_at: string | null
          description: string | null
          dress_type: number | null
          id: number | null
          photos: string[] | null
          price: number | null
          title: string | null
          vendor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_vendor_fkey"
            columns: ["vendor"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vendor_fkey"
            columns: ["vendor"]
            isOneToOne: false
            referencedRelation: "vendor_with_image_path"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vendor_fkey"
            columns: ["vendor"]
            isOneToOne: false
            referencedRelation: "vendor_with_media_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_with_image_path: {
        Row: {
          created_at: string | null
          id: number | null
          image: string | null
          location: string | null
          name: string | null
          object_path: string | null
        }
        Relationships: []
      }
      vendor_with_media_paths: {
        Row: {
          address: string | null
          banner_path: string | null
          certificate_paths: string[] | null
          created_at: string | null
          email: string | null
          id: number | null
          landline: string | null
          location: string | null
          location_url: string | null
          mobile: string | null
          name: string | null
          profile_image_path: string | null
          shop_image_paths: string[] | null
          shop_name: string | null
          shop_video_paths: string[] | null
          status: string | null
        }
        Insert: {
          address?: string | null
          banner_path?: string | null
          certificate_paths?: string[] | null
          created_at?: string | null
          email?: string | null
          id?: number | null
          landline?: string | null
          location?: string | null
          location_url?: string | null
          mobile?: string | null
          name?: string | null
          profile_image_path?: string | null
          shop_image_paths?: string[] | null
          shop_name?: string | null
          shop_video_paths?: string[] | null
          status?: string | null
        }
        Update: {
          address?: string | null
          banner_path?: string | null
          certificate_paths?: string[] | null
          created_at?: string | null
          email?: string | null
          id?: number | null
          landline?: string | null
          location?: string | null
          location_url?: string | null
          mobile?: string | null
          name?: string | null
          profile_image_path?: string | null
          shop_image_paths?: string[] | null
          shop_name?: string | null
          shop_video_paths?: string[] | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
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
