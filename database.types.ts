export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      adoption_bookmarks: {
        Row: {
          adoption_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          adoption_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          adoption_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_bookmarks_adoption_id_fkey"
            columns: ["adoption_id"]
            isOneToOne: false
            referencedRelation: "adoptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_comments: {
        Row: {
          adoption_id: string
          comment: string
          created_at: string
          deleted_at: string | null
          id: string
          reports_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adoption_id: string
          comment: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          reports_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adoption_id?: string
          comment?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          reports_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_comments_adoption_id_fkey"
            columns: ["adoption_id"]
            isOneToOne: false
            referencedRelation: "adoptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      adoptions: {
        Row: {
          adopted: boolean
          age: "baby" | "young" | "adult" | "senior" | null
          breed: string | null
          comment_enabled: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          fts: unknown
          gender: "male" | "female" | null
          id: string
          images: string[] | null
          location: unknown
          reports_count: number
          size: "small" | "medium" | "large" | null
          source: Database["public"]["Enums"]["adoption_source"] | null
          status: "open" | "closed"
          title: string
          type: Database["public"]["Enums"]["pet_type"]
          updated_at: string | null
          user_id: string
          videos: string[] | null
        }
        Insert: {
          adopted?: boolean
          age?: "baby" | "young" | "adult" | "senior" | null
          breed?: string | null
          comment_enabled?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          fts?: unknown
          gender?: "male" | "female" | null
          id?: string
          images?: string[] | null
          location: unknown
          reports_count?: number
          size?: "small" | "medium" | "large" | null
          source?: Database["public"]["Enums"]["adoption_source"] | null
          status?: "open" | "closed"
          title: string
          type: Database["public"]["Enums"]["pet_type"]
          updated_at?: string | null
          user_id: string
          videos?: string[] | null
        }
        Update: {
          adopted?: boolean
          age?: "baby" | "young" | "adult" | "senior" | null
          breed?: string | null
          comment_enabled?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          fts?: unknown
          gender?: "male" | "female" | null
          id?: string
          images?: string[] | null
          location?: unknown
          reports_count?: number
          size?: "small" | "medium" | "large" | null
          source?: Database["public"]["Enums"]["adoption_source"] | null
          status?: "open" | "closed"
          title?: string
          type?: Database["public"]["Enums"]["pet_type"]
          updated_at?: string | null
          user_id?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "adoptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_answer_bookmarks: {
        Row: {
          created_at: string
          discussion_answer_id: string
          discussion_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_answer_id: string
          discussion_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_answer_id?: string
          discussion_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_answer_bookmarks_discussion_answer_id_fkey"
            columns: ["discussion_answer_id"]
            isOneToOne: false
            referencedRelation: "discussion_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_answer_bookmarks_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_answer_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_answer_comments: {
        Row: {
          answer_id: string
          comment: string | null
          created_at: string
          deleted_at: string | null
          discussion_id: string
          id: string
          reports_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer_id: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          discussion_id: string
          id?: string
          reports_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answer_id?: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          discussion_id?: string
          id?: string
          reports_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_answer_comments_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "discussion_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_answer_comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_answer_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_answer_votes: {
        Row: {
          answer_id: string
          created_at: string
          discussion_id: string
          type: "up" | "down"
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          discussion_id: string
          type: "up" | "down"
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          discussion_id?: string
          type?: "up" | "down"
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_answer_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "discussion_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_answer_votes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_answer_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_answers: {
        Row: {
          comments_count: number
          content: string | null
          created_at: string
          deleted_at: string | null
          discussion_id: string
          id: string
          points: number
          reports_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          discussion_id: string
          id?: string
          points?: number
          reports_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          discussion_id?: string
          id?: string
          points?: number
          reports_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_answers_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_bookmarks: {
        Row: {
          created_at: string
          discussion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_bookmarks_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_votes: {
        Row: {
          created_at: string
          discussion_id: string
          type: "up" | "down"
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          type: "up" | "down"
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          type?: "up" | "down"
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_votes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          answer_id: string | null
          answers_count: number
          category: Database["public"]["Enums"]["discussion_category"] | null
          content: string | null
          created_at: string
          deleted_at: string | null
          fts: unknown
          id: string
          images: string[] | null
          points: number
          reports_count: number
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          videos: string[] | null
          views_count: number
        }
        Insert: {
          answer_id?: string | null
          answers_count?: number
          category?: Database["public"]["Enums"]["discussion_category"] | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          fts?: unknown
          id?: string
          images?: string[] | null
          points?: number
          reports_count?: number
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          videos?: string[] | null
          views_count?: number
        }
        Update: {
          answer_id?: string | null
          answers_count?: number
          category?: Database["public"]["Enums"]["discussion_category"] | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          fts?: unknown
          id?: string
          images?: string[] | null
          points?: number
          reports_count?: number
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          videos?: string[] | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discussions_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "discussion_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_bookmarks: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          comment: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
          reports_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
          reports_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
          reports_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comment_enabled: boolean
          comments_count: number
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          images: string[] | null
          likes_count: number
          reports_count: number
          tags: string[] | null
          updated_at: string | null
          user_id: string
          videos: string[] | null
        }
        Insert: {
          comment_enabled?: boolean
          comments_count?: number
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          images?: string[] | null
          likes_count?: number
          reports_count?: number
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          videos?: string[] | null
        }
        Update: {
          comment_enabled?: boolean
          comments_count?: number
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          images?: string[] | null
          likes_count?: number
          reports_count?: number
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          entity: Database["public"]["Enums"]["report_entity"]
          entity_id: string
          id: string
          type: Database["public"]["Enums"]["report_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          entity: Database["public"]["Enums"]["report_entity"]
          entity_id: string
          id?: string
          type: Database["public"]["Enums"]["report_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          entity?: Database["public"]["Enums"]["report_entity"]
          entity_id?: string
          id?: string
          type?: Database["public"]["Enums"]["report_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blockings: {
        Row: {
          blocked_user_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blockings_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blockings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_followings: {
        Row: {
          created_at: string
          followed_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followed_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          followed_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_followings_followed_user_id_fkey"
            columns: ["followed_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_followings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          last_seen: string | null
          phone: string | null
          profile_photo: string | null
          telegram_url: string | null
          tiktok_url: string | null
          username: string
          x_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id: string
          instagram_url?: string | null
          last_seen?: string | null
          phone?: string | null
          profile_photo?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          username?: string
          x_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          last_seen?: string | null
          phone?: string | null
          profile_photo?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          username?: string
          x_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      discussion_answer_set_correct: {
        Args: { discussion_id_param: string; answer_id_param: string }
        Returns: undefined
      }
      followers_posts: {
        Args: { current_user_id_param: string; limits: number; offsets: number }
        Returns: {
          id: string
          content: string
          user_id: string
          created_at: string
          updated_at: string
          comment_enabled: boolean
          images: string[]
          videos: string[]
          tags: string[]
          likes_count: number
          comments_count: number
          liked: boolean
          bookmarked: boolean
          user: Json
        }[]
      }
      get_discussion_answers: {
        Args: {
          current_user_id_param: string
          discussion_id_param: string
          limits: number
          offsets: number
        }
        Returns: {
          id: string
          user_id: string
          discussion_id: string
          created_at: string
          updated_at: string
          content: string
          points: number
          comments_count: number
          reports_count: number
          bookmarked: boolean
          user: Json
          voted_type: "up" | "down"
          comments: Json
        }[]
      }
      get_discussions: {
        Args: {
          current_user_id_param: string
          limits: number
          offsets: number
          search_tag?: string
          discussion_id_param?: string
          owner_user_id_param?: string
        }
        Returns: {
          id: string
          title: string
          content: string
          user_id: string
          created_at: string
          updated_at: string
          images: string[]
          videos: string[]
          tags: string[]
          points: number
          views_count: number
          answers_count: number
          answer_id: string
          bookmarked: boolean
          user: Json
          category: Database["public"]["Enums"]["discussion_category"]
          answer: Json
          voted_type: "up" | "down"
        }[]
      }
      get_discussions_by_category: {
        Args: { category_name: string }
        Returns: {
          answer_id: string | null
          answers_count: number
          category: Database["public"]["Enums"]["discussion_category"] | null
          content: string | null
          created_at: string
          deleted_at: string | null
          fts: unknown
          id: string
          images: string[] | null
          points: number
          reports_count: number
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          videos: string[] | null
          views_count: number
        }[]
      }
      get_posts: {
        Args: {
          current_user_id_param: string
          limits: number
          offsets: number
          post_id_param?: string
          owner_user_id_param?: string
        }
        Returns: {
          id: string
          content: string
          user_id: string
          created_at: string
          updated_at: string
          comment_enabled: boolean
          images: string[]
          videos: string[]
          tags: string[]
          likes_count: number
          comments_count: number
          liked: boolean
          bookmarked: boolean
          user: Json
        }[]
      }
      is_discussion_answers_vote_by_user: {
        Args: { user_id_param: string; answers_ids: string[] }
        Returns: {
          answer_id: string
          type: "up" | "down"
        }[]
      }
      is_discussion_vote_by_user: {
        Args: { user_id_param: string; discussion_ids: string[] }
        Returns: {
          discussion_id: string
          type: "up" | "down"
        }[]
      }
      is_posts_bookmarks_by_user: {
        Args: { user_id_param: string; post_ids_param: string[] }
        Returns: {
          post_id: string
          is_bookmark: boolean
        }[]
      }
      is_posts_likes_by_user: {
        Args: { user_id_param: string; post_ids_param: string[] }
        Returns: {
          post_id: string
          is_liked: boolean
        }[]
      }
      nearby_adoptions: {
        Args: {
          lat_param: number
          long_param: number
          limits: number
          offsets: number
          sources_filter_param: Database["public"]["Enums"]["adoption_source"][]
          pet_types_filter_param: Database["public"]["Enums"]["pet_type"][]
          pet_sizes_filter_param: ("small" | "medium" | "large")[]
          pet_ages_filter_param: ("baby" | "young" | "adult" | "senior")[]
          pet_genders_filter_param: ("male" | "female")[]
          owner_user_id_param?: string
        }
        Returns: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          user: Json
          title: string
          breed: string
          description: string
          comment_enabled: boolean
          source: Database["public"]["Enums"]["adoption_source"]
          gender: "male" | "female"
          size: "small" | "medium" | "large"
          age: "baby" | "young" | "adult" | "senior"
          type: Database["public"]["Enums"]["pet_type"]
          images: string[]
          videos: string[]
          adopted: boolean
          lat: number
          long: number
          dist_meters: number
        }[]
      }
      update_discussions_table_views_count: {
        Args: { discussion_id: string }
        Returns: undefined
      }
    }
    Enums: {
      adoption_source:
        | "street"
        | "shelter"
        | "home"
        | "temporary_home"
        | "veterinary_clinic"
      discussion_answer_vote_type: "up" | "down"
      discussion_category:
        | "health"
        | "nutrition"
        | "training"
        | "breeding"
        | "grooming"
        | "product"
      discussion_vote_type: "up" | "down"
      pet_adoption_status: "open" | "closed"
      pet_age: "baby" | "young" | "adult" | "senior"
      pet_gender: "male" | "female"
      pet_size: "small" | "medium" | "large"
      pet_type:
        | "dog"
        | "cat"
        | "bird"
        | "rabbit"
        | "hamster"
        | "fish"
        | "turtle"
        | "reptile"
        | "other"
      report_entity:
        | "posts"
        | "post_comments"
        | "discussion"
        | "discussion_answers"
        | "discussion_answer_comments"
        | "adoptions"
        | "adoption_comments"
      report_type:
        | "spam"
        | "harassment"
        | "hate_speech"
        | "violence"
        | "nudity"
        | "false_information"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adoption_source: [
        "street",
        "shelter",
        "home",
        "temporary_home",
        "veterinary_clinic",
      ],
      discussion_answer_vote_type: ["up", "down"],
      discussion_category: [
        "health",
        "nutrition",
        "training",
        "breeding",
        "grooming",
        "product",
      ],
      discussion_vote_type: ["up", "down"],
      pet_adoption_status: ["open", "closed"],
      pet_age: ["baby", "young", "adult", "senior"],
      pet_gender: ["male", "female"],
      pet_size: ["small", "medium", "large"],
      pet_type: [
        "dog",
        "cat",
        "bird",
        "rabbit",
        "hamster",
        "fish",
        "turtle",
        "reptile",
        "other",
      ],
      report_entity: [
        "posts",
        "post_comments",
        "discussion",
        "discussion_answers",
        "discussion_answer_comments",
        "adoptions",
        "adoption_comments",
      ],
      report_type: [
        "spam",
        "harassment",
        "hate_speech",
        "violence",
        "nudity",
        "false_information",
        "other",
      ],
    },
  },
} as const
