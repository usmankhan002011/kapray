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
          created_at: string
          id: number
          image: string | null
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          image?: string | null
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          image?: string | null
          location?: string | null
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
