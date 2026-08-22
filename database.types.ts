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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      account_deletions: {
        Row: {
          deleted_at: string
          id: string
          original_user_id_hash: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          original_user_id_hash: string
        }
        Update: {
          deleted_at?: string
          id?: string
          original_user_id_hash?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      adoption_applications: {
        Row: {
          adoption_id: string
          answers: Json
          applicant_id: string
          chat_room_id: string | null
          created_at: string
          id: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          adoption_id: string
          answers: Json
          applicant_id: string
          chat_room_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          adoption_id?: string
          answers?: Json
          applicant_id?: string
          chat_room_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_applications_adoption_id_fkey"
            columns: ["adoption_id"]
            isOneToOne: false
            referencedRelation: "adoptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_applications_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      adoption_push_log: {
        Row: {
          adoption_id: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          adoption_id: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          adoption_id?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_push_log_adoption_id_fkey"
            columns: ["adoption_id"]
            isOneToOne: false
            referencedRelation: "adoptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adoption_push_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      adoption_push_prefs: {
        Row: {
          city: string
          consent_accepted_at: string
          consent_text_version: string
          district: string | null
          home_lat: number | null
          home_lng: number | null
          home_point: unknown
          location_consent_accepted_at: string | null
          location_consent_version: string | null
          radius_m: number | null
          user_id: string
        }
        Insert: {
          city: string
          consent_accepted_at?: string
          consent_text_version: string
          district?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_point?: unknown
          location_consent_accepted_at?: string | null
          location_consent_version?: string | null
          radius_m?: number | null
          user_id: string
        }
        Update: {
          city?: string
          consent_accepted_at?: string
          consent_text_version?: string
          district?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_point?: unknown
          location_consent_accepted_at?: string | null
          location_consent_version?: string | null
          radius_m?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adoption_push_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      adoptions: {
        Row: {
          adopted: boolean
          age: Database["public"]["Enums"]["pet_age"] | null
          application_questions: Json | null
          breed: string | null
          city: string | null
          comment_enabled: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          district: string | null
          extra_info: Json | null
          fts: unknown
          gender: Database["public"]["Enums"]["pet_gender"] | null
          good_with_kids: boolean | null
          good_with_pets: boolean | null
          id: string
          images: string[] | null
          lifecycle_last_activity_at: string
          lifecycle_reminder_stage: number
          location: unknown
          neutered: boolean | null
          public_location: unknown
          reports_count: number
          size: Database["public"]["Enums"]["pet_size"] | null
          source: Database["public"]["Enums"]["adoption_source"] | null
          status: Database["public"]["Enums"]["pet_adoption_status"]
          title: string
          type: Database["public"]["Enums"]["pet_type"]
          updated_at: string | null
          user_id: string
          vaccinated: boolean | null
          videos: string[] | null
        }
        Insert: {
          adopted?: boolean
          age?: Database["public"]["Enums"]["pet_age"] | null
          application_questions?: Json | null
          breed?: string | null
          city?: string | null
          comment_enabled?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          extra_info?: Json | null
          fts?: unknown
          gender?: Database["public"]["Enums"]["pet_gender"] | null
          good_with_kids?: boolean | null
          good_with_pets?: boolean | null
          id?: string
          images?: string[] | null
          lifecycle_last_activity_at?: string
          lifecycle_reminder_stage?: number
          location: unknown
          neutered?: boolean | null
          public_location?: unknown
          reports_count?: number
          size?: Database["public"]["Enums"]["pet_size"] | null
          source?: Database["public"]["Enums"]["adoption_source"] | null
          status?: Database["public"]["Enums"]["pet_adoption_status"]
          title: string
          type: Database["public"]["Enums"]["pet_type"]
          updated_at?: string | null
          user_id: string
          vaccinated?: boolean | null
          videos?: string[] | null
        }
        Update: {
          adopted?: boolean
          age?: Database["public"]["Enums"]["pet_age"] | null
          application_questions?: Json | null
          breed?: string | null
          city?: string | null
          comment_enabled?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          extra_info?: Json | null
          fts?: unknown
          gender?: Database["public"]["Enums"]["pet_gender"] | null
          good_with_kids?: boolean | null
          good_with_pets?: boolean | null
          id?: string
          images?: string[] | null
          lifecycle_last_activity_at?: string
          lifecycle_reminder_stage?: number
          location?: unknown
          neutered?: boolean | null
          public_location?: unknown
          reports_count?: number
          size?: Database["public"]["Enums"]["pet_size"] | null
          source?: Database["public"]["Enums"]["adoption_source"] | null
          status?: Database["public"]["Enums"]["pet_adoption_status"]
          title?: string
          type?: Database["public"]["Enums"]["pet_type"]
          updated_at?: string | null
          user_id?: string
          vaccinated?: boolean | null
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
      analytics_anon_budget: {
        Row: {
          hits: number
          hour: string
        }
        Insert: {
          hits?: number
          hour: string
        }
        Update: {
          hits?: number
          hour?: string
        }
        Relationships: []
      }
      analytics_event_catalog: {
        Row: {
          allowed_prop_keys: string[]
          allowed_prop_values: Json
          event_name: string
          guest_bucket_from: string | null
          scope: string
        }
        Insert: {
          allowed_prop_keys?: string[]
          allowed_prop_values?: Json
          event_name: string
          guest_bucket_from?: string | null
          scope: string
        }
        Update: {
          allowed_prop_keys?: string[]
          allowed_prop_values?: Json
          event_name?: string
          guest_bucket_from?: string | null
          scope?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          app_version: string | null
          created_at: string
          event_name: string
          id: number
          occurred_at: string
          platform: string | null
          props: Json
          screen: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          event_name: string
          id?: never
          occurred_at: string
          platform?: string | null
          props?: Json
          screen?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          event_name?: string
          id?: never
          occurred_at?: string
          platform?: string | null
          props?: Json
          screen?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_event_name_fkey"
            columns: ["event_name"]
            isOneToOne: false
            referencedRelation: "analytics_event_catalog"
            referencedColumns: ["event_name"]
          },
        ]
      }
      analytics_guest_daily: {
        Row: {
          bucket_key: string
          day: string
          event_name: string
          hits: number
        }
        Insert: {
          bucket_key?: string
          day?: string
          event_name: string
          hits?: number
        }
        Update: {
          bucket_key?: string
          day?: string
          event_name?: string
          hits?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_guest_daily_event_name_fkey"
            columns: ["event_name"]
            isOneToOne: false
            referencedRelation: "analytics_event_catalog"
            referencedColumns: ["event_name"]
          },
        ]
      }
      app_flags: {
        Row: {
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_release_gate: {
        Row: {
          latest_store_build: number
          maintenance: boolean
          message_en: string | null
          message_tr: string | null
          min_build_number: number
          platform: string
          recommended_build: number
          store_url: string | null
          updated_at: string
        }
        Insert: {
          latest_store_build: number
          maintenance?: boolean
          message_en?: string | null
          message_tr?: string | null
          min_build_number?: number
          platform: string
          recommended_build?: number
          store_url?: string | null
          updated_at?: string
        }
        Update: {
          latest_store_build?: number
          maintenance?: boolean
          message_en?: string | null
          message_tr?: string | null
          min_build_number?: number
          platform?: string
          recommended_build?: number
          store_url?: string | null
          updated_at?: string
        }
        Relationships: []
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
          type: Database["public"]["Enums"]["discussion_answer_vote_type"]
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          discussion_id: string
          type: Database["public"]["Enums"]["discussion_answer_vote_type"]
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          discussion_id?: string
          type?: Database["public"]["Enums"]["discussion_answer_vote_type"]
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
          type: Database["public"]["Enums"]["discussion_vote_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          type: Database["public"]["Enums"]["discussion_vote_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          type?: Database["public"]["Enums"]["discussion_vote_type"]
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
      emergency_cases: {
        Row: {
          city: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          district: string | null
          id: string
          kind: Database["public"]["Enums"]["emergency_kind"]
          lifecycle_reminder_stage: number
          location: unknown
          pet_type: Database["public"]["Enums"]["pet_type"]
          photo_url: string
          reporter_user_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["emergency_status"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          id?: string
          kind: Database["public"]["Enums"]["emergency_kind"]
          lifecycle_reminder_stage?: number
          location: unknown
          pet_type: Database["public"]["Enums"]["pet_type"]
          photo_url: string
          reporter_user_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["emergency_status"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["emergency_kind"]
          lifecycle_reminder_stage?: number
          location?: unknown
          pet_type?: Database["public"]["Enums"]["pet_type"]
          photo_url?: string
          reporter_user_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["emergency_status"]
          updated_at?: string
        }
        Relationships: []
      }
      emergency_push_log: {
        Row: {
          emergency_id: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          emergency_id: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          emergency_id?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_push_log_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergency_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_push_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_push_prefs: {
        Row: {
          city: string
          consent_accepted_at: string
          consent_text_version: string
          district: string | null
          home_lat: number | null
          home_lng: number | null
          home_point: unknown
          location_consent_accepted_at: string | null
          location_consent_version: string | null
          radius_m: number | null
          user_id: string
        }
        Insert: {
          city: string
          consent_accepted_at?: string
          consent_text_version: string
          district?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_point?: unknown
          location_consent_accepted_at?: string | null
          location_consent_version?: string | null
          radius_m?: number | null
          user_id: string
        }
        Update: {
          city?: string
          consent_accepted_at?: string
          consent_text_version?: string
          district?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_point?: unknown
          location_consent_accepted_at?: string | null
          location_consent_version?: string | null
          radius_m?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_push_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          app_version: string | null
          category: string
          created_at: string
          id: string
          message: string
          os_version: string | null
          platform: string | null
          screenshot_path: string | null
          status: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          os_version?: string | null
          platform?: string | null
          screenshot_path?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          app_version?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          os_version?: string | null
          platform?: string | null
          screenshot_path?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      lf_match_notify_prefs: {
        Row: {
          consent_version: string
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_version: string
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_version?: string
          enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lf_match_notify_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lf_match_push_log: {
        Row: {
          id: string
          new_lf_id: string
          notified_lf_id: string
          notified_user_id: string
          outcome: string
          policy_version: number
          reason: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          new_lf_id: string
          notified_lf_id: string
          notified_user_id: string
          outcome?: string
          policy_version: number
          reason?: string | null
          sent_at?: string
        }
        Update: {
          id?: string
          new_lf_id?: string
          notified_lf_id?: string
          notified_user_id?: string
          outcome?: string
          policy_version?: number
          reason?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lf_match_push_log_new_lf_id_fkey"
            columns: ["new_lf_id"]
            isOneToOne: false
            referencedRelation: "lost_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lf_match_push_log_notified_lf_id_fkey"
            columns: ["notified_lf_id"]
            isOneToOne: false
            referencedRelation: "lost_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lf_match_push_log_notified_user_id_fkey"
            columns: ["notified_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found: {
        Row: {
          breed: string | null
          city: string
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          district: string | null
          gender: Database["public"]["Enums"]["pet_gender"] | null
          id: string
          images: string[] | null
          last_rebroadcast_at: string | null
          lifecycle_last_activity_at: string
          lifecycle_reminder_stage: number
          location: unknown
          lost_date: string | null
          public_location: unknown
          reports_count: number
          reward_amount: number | null
          reward_offered: boolean
          sightings_count: number
          status: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          breed?: string | null
          city: string
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          gender?: Database["public"]["Enums"]["pet_gender"] | null
          id?: string
          images?: string[] | null
          last_rebroadcast_at?: string | null
          lifecycle_last_activity_at?: string
          lifecycle_reminder_stage?: number
          location?: unknown
          lost_date?: string | null
          public_location?: unknown
          reports_count?: number
          reward_amount?: number | null
          reward_offered?: boolean
          sightings_count?: number
          status?: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          breed?: string | null
          city?: string
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          gender?: Database["public"]["Enums"]["pet_gender"] | null
          id?: string
          images?: string[] | null
          last_rebroadcast_at?: string | null
          lifecycle_last_activity_at?: string
          lifecycle_reminder_stage?: number
          location?: unknown
          lost_date?: string | null
          public_location?: unknown
          reports_count?: number
          reward_amount?: number | null
          reward_offered?: boolean
          sightings_count?: number
          status?: Database["public"]["Enums"]["lf_status"]
          type?: Database["public"]["Enums"]["pet_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_bookmarks: {
        Row: {
          created_at: string
          lost_found_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lost_found_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          lost_found_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_bookmarks_lost_found_id_fkey"
            columns: ["lost_found_id"]
            isOneToOne: false
            referencedRelation: "lost_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_private: {
        Row: {
          cip_no: string | null
          lost_found_id: string
          phone_number: string | null
        }
        Insert: {
          cip_no?: string | null
          lost_found_id: string
          phone_number?: string | null
        }
        Update: {
          cip_no?: string | null
          lost_found_id?: string
          phone_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_private_lost_found_id_fkey"
            columns: ["lost_found_id"]
            isOneToOne: true
            referencedRelation: "lost_found"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_push_prefs: {
        Row: {
          city: string
          consent_accepted_at: string
          consent_text_version: string
          district: string | null
          home_lat: number | null
          home_lng: number | null
          home_point: unknown
          location_consent_accepted_at: string | null
          location_consent_version: string | null
          radius_m: number | null
          user_id: string
        }
        Insert: {
          city: string
          consent_accepted_at?: string
          consent_text_version: string
          district?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_point?: unknown
          location_consent_accepted_at?: string | null
          location_consent_version?: string | null
          radius_m?: number | null
          user_id: string
        }
        Update: {
          city?: string
          consent_accepted_at?: string
          consent_text_version?: string
          district?: string | null
          home_lat?: number | null
          home_lng?: number | null
          home_point?: unknown
          location_consent_accepted_at?: string | null
          location_consent_version?: string | null
          radius_m?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_push_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_reunions: {
        Row: {
          created_at: string
          helper_user_id: string | null
          id: string
          listing_id: string
          owner_id: string
          via_patify: boolean
        }
        Insert: {
          created_at?: string
          helper_user_id?: string | null
          id?: string
          listing_id: string
          owner_id: string
          via_patify?: boolean
        }
        Update: {
          created_at?: string
          helper_user_id?: string | null
          id?: string
          listing_id?: string
          owner_id?: string
          via_patify?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_reunions_helper_user_id_fkey"
            columns: ["helper_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_reunions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "lost_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_reunions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found_sightings: {
        Row: {
          cip_no: string | null
          created_at: string
          id: string
          location: unknown
          location_text: string
          lost_found_id: string
          note: string | null
          photo: string | null
          public_location: unknown
          reporter_contact: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          cip_no?: string | null
          created_at?: string
          id?: string
          location?: unknown
          location_text: string
          lost_found_id: string
          note?: string | null
          photo?: string | null
          public_location?: unknown
          reporter_contact?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          cip_no?: string | null
          created_at?: string
          id?: string
          location?: unknown
          location_text?: string
          lost_found_id?: string
          note?: string | null
          photo?: string | null
          public_location?: unknown
          reporter_contact?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_sightings_lost_found_id_fkey"
            columns: ["lost_found_id"]
            isOneToOne: false
            referencedRelation: "lost_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_found_sightings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_daily: {
        Row: {
          day: string
          dims: Json
          metric: string
          value: number
        }
        Insert: {
          day: string
          dims?: Json
          metric: string
          value: number
        }
        Update: {
          day?: string
          dims?: Json
          metric?: string
          value?: number
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action: string
          actor_admin: string
          created_at: string
          id: string
          meta: Json
          reason: string | null
          report_id: string | null
          target_entity: Database["public"]["Enums"]["report_entity"] | null
          target_entity_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_admin: string
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          report_id?: string | null
          target_entity?: Database["public"]["Enums"]["report_entity"] | null
          target_entity_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_admin?: string
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          report_id?: string | null
          target_entity?: Database["public"]["Enums"]["report_entity"] | null
          target_entity_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          adoption_status: boolean
          chat: boolean
          my_listing: boolean
          quiet_end: number | null
          quiet_start: number | null
          quiet_tz: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adoption_status?: boolean
          chat?: boolean
          my_listing?: boolean
          quiet_end?: number | null
          quiet_start?: number | null
          quiet_tz?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adoption_status?: boolean
          chat?: boolean
          my_listing?: boolean
          quiet_end?: number | null
          quiet_start?: number | null
          quiet_tz?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          data: Json
          id: number
          is_read: boolean
          title: string | null
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          data?: Json
          id?: never
          is_read?: boolean
          title?: string | null
          type: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          data?: Json
          id?: never
          is_read?: boolean
          title?: string | null
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
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
      push_log: {
        Row: {
          id: string
          lost_found_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          lost_found_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          lost_found_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_log_lost_found_id_fkey"
            columns: ["lost_found_id"]
            isOneToOne: false
            referencedRelation: "lost_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_send_audit: {
        Row: {
          created_at: string
          id: number
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: never
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          entity: Database["public"]["Enums"]["report_entity"]
          entity_id: string
          id: string
          resolution: Database["public"]["Enums"]["report_resolution"] | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          type: Database["public"]["Enums"]["report_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          entity: Database["public"]["Enums"]["report_entity"]
          entity_id: string
          id?: string
          resolution?: Database["public"]["Enums"]["report_resolution"] | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          type: Database["public"]["Enums"]["report_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          entity?: Database["public"]["Enums"]["report_entity"]
          entity_id?: string
          id?: string
          resolution?: Database["public"]["Enums"]["report_resolution"] | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
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
      user_bans: {
        Row: {
          banned_by: string
          banned_until: string | null
          created_at: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          banned_until?: string | null
          created_at?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          banned_until?: string | null
          created_at?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_private: {
        Row: {
          accepts_dms: boolean
          analytics_consent_at: string | null
          analytics_consent_version: string | null
          birth_date: string | null
          consent_accepted_at: string | null
          home_city: string | null
          home_district: string | null
          phone: string | null
          pp_version: string | null
          tos_version: string | null
          user_id: string
        }
        Insert: {
          accepts_dms?: boolean
          analytics_consent_at?: string | null
          analytics_consent_version?: string | null
          birth_date?: string | null
          consent_accepted_at?: string | null
          home_city?: string | null
          home_district?: string | null
          phone?: string | null
          pp_version?: string | null
          tos_version?: string | null
          user_id: string
        }
        Update: {
          accepts_dms?: boolean
          analytics_consent_at?: string | null
          analytics_consent_version?: string | null
          birth_date?: string | null
          consent_accepted_at?: string | null
          home_city?: string | null
          home_district?: string | null
          phone?: string | null
          pp_version?: string | null
          tos_version?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
          profile_photo: string | null
          telegram_url: string | null
          tiktok_url: string | null
          username: string | null
          x_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id: string
          instagram_url?: string | null
          last_seen?: string | null
          profile_photo?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          username?: string | null
          x_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          last_seen?: string | null
          profile_photo?: string | null
          telegram_url?: string | null
          tiktok_url?: string | null
          username?: string | null
          x_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_chat_first_reply: {
        Row: {
          median_time_to_first_reply: string | null
          reply_rate: number | null
          rooms_with_message: number | null
          rooms_with_reply: number | null
        }
        Relationships: []
      }
      v_dead_features: {
        Row: {
          active_30d: number | null
          active_90d: number | null
          last_activity: string | null
          module: string | null
        }
        Relationships: []
      }
      v_feature_usage_weekly: {
        Row: {
          activity_count: number | null
          module: string | null
          surface: string | null
          week: string | null
        }
        Relationships: []
      }
      v_form_dropoff: {
        Row: {
          abandoned: number | null
          opened: number | null
          photo_added: number | null
          submit_rate: number | null
          submitted: number | null
        }
        Relationships: []
      }
      v_funnel_adoption: {
        Row: {
          accepted: number | null
          application_submitted: number | null
          created: number | null
          owner_responded: number | null
        }
        Relationships: []
      }
      v_funnel_guest: {
        Row: {
          day: string | null
          guest_login_wall_hits: number | null
          guest_screen_views: number | null
          signups: number | null
        }
        Relationships: []
      }
      v_funnel_lost_found: {
        Row: {
          created: number | null
          push_broadcast: number | null
          reunited: number | null
          sighting_received: number | null
        }
        Relationships: []
      }
      v_funnel_signup: {
        Row: {
          consent_accepted: number | null
          first_content: number | null
          signed_up: number | null
          username_set: number | null
        }
        Relationships: []
      }
      v_north_star_response_48h: {
        Row: {
          responded_count: number | null
          response_rate: number | null
          surface: string | null
          total_count: number | null
          week: string | null
        }
        Relationships: []
      }
      v_retention_cohort: {
        Row: {
          cohort_size: number | null
          cohort_week: string | null
          retained_users: number | null
          retention_rate: number | null
          weeks_since_signup: number | null
        }
        Relationships: []
      }
      v_search_health: {
        Row: {
          filter_count: number | null
          searches: number | null
          surface: string | null
          zero_result_rate: number | null
          zero_result_searches: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _content_owner: {
        Args: {
          p_entity: Database["public"]["Enums"]["report_entity"]
          p_id: string
        }
        Returns: string
      }
      _mod_resolve_and_log: {
        Args: {
          p_action: string
          p_entity: Database["public"]["Enums"]["report_entity"]
          p_entity_id: string
          p_meta?: Json
          p_reason: string
          p_resolution: Database["public"]["Enums"]["report_resolution"]
          p_target_user: string
        }
        Returns: undefined
      }
      _trust_compute: { Args: { p_id: string }; Returns: Json }
      admin_ban_finalize: {
        Args: {
          p_entity: Database["public"]["Enums"]["report_entity"]
          p_entity_id: string
          p_reason: string
          p_target_user: string
        }
        Returns: undefined
      }
      admin_content_health: {
        Args: never
        Returns: {
          n: number
          status: string
          surface: string
        }[]
      }
      admin_content_list: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_surface: string
        }
        Returns: {
          created_at: string
          id: string
          owner_id: string
          owner_username: string
          preview: string
          reports_count: number
          status: string
        }[]
      }
      admin_dismiss_reports: {
        Args: {
          p_entity: Database["public"]["Enums"]["report_entity"]
          p_entity_id: string
          p_note: string
        }
        Returns: undefined
      }
      admin_feedback_list: {
        Args: never
        Returns: {
          app_version: string | null
          category: string
          created_at: string
          id: string
          message: string
          os_version: string | null
          platform: string | null
          screenshot_path: string | null
          status: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "feedback"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_hide_content: {
        Args: {
          p_entity: Database["public"]["Enums"]["report_entity"]
          p_entity_id: string
          p_reason: string
        }
        Returns: undefined
      }
      admin_list_users: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          adoption_count: number
          blocks_against: number
          created_at: string
          id: string
          is_banned: boolean
          is_trusted: boolean
          last_seen: string
          lf_count: number
          post_count: number
          profile_photo: string
          username: string
        }[]
      }
      admin_metric_series: {
        Args: { p_days?: number; p_metric: string }
        Returns: {
          day: string
          dims: Json
          value: number
        }[]
      }
      admin_overview_counts: { Args: never; Returns: Json }
      admin_reactivate_content: {
        Args: {
          p_entity: Database["public"]["Enums"]["report_entity"]
          p_entity_id: string
        }
        Returns: undefined
      }
      admin_report_queue: {
        Args: never
        Returns: {
          content_exists: boolean
          content_preview: string
          distinct_reporters: number
          entity: Database["public"]["Enums"]["report_entity"]
          entity_id: string
          first_at: string
          last_at: string
          owner_id: string
          owner_recent_blockers: number
          owner_username: string
          report_count: number
          types: Json
        }[]
      }
      admin_set_feedback_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      admin_user_detail: { Args: { p_user_id: string }; Returns: Json }
      admin_warn_user: {
        Args: {
          p_entity: Database["public"]["Enums"]["report_entity"]
          p_entity_id: string
          p_message: string
        }
        Returns: undefined
      }
      adoptions_in_bounds: {
        Args: {
          good_with_kids_param?: boolean
          good_with_pets_param?: boolean
          limits?: number
          max_lat: number
          max_long: number
          min_lat: number
          min_long: number
          neutered_param?: boolean
          owner_user_id_param?: string
          pet_ages_filter_param?: Database["public"]["Enums"]["pet_age"][]
          pet_genders_filter_param?: Database["public"]["Enums"]["pet_gender"][]
          pet_sizes_filter_param?: Database["public"]["Enums"]["pet_size"][]
          pet_types_filter_param?: Database["public"]["Enums"]["pet_type"][]
          sources_filter_param?: Database["public"]["Enums"]["adoption_source"][]
          vaccinated_param?: boolean
        }
        Returns: {
          adopted: boolean
          age: Database["public"]["Enums"]["pet_age"]
          application_questions: Json
          breed: string
          city: string
          comment_enabled: boolean
          created_at: string
          description: string
          dist_meters: number
          district: string
          extra_info: Json
          gender: Database["public"]["Enums"]["pet_gender"]
          good_with_kids: boolean
          good_with_pets: boolean
          id: string
          images: string[]
          lat: number
          lifecycle_last_activity_at: string
          long: number
          neutered: boolean
          size: Database["public"]["Enums"]["pet_size"]
          source: Database["public"]["Enums"]["adoption_source"]
          status: Database["public"]["Enums"]["pet_adoption_status"]
          title: string
          type: Database["public"]["Enums"]["pet_type"]
          updated_at: string
          user: Json
          user_id: string
          vaccinated: boolean
          videos: string[]
        }[]
      }
      analytics_props_valid: {
        Args: { allowed: string[]; allowed_values: Json; props: Json }
        Returns: boolean
      }
      browse_adoptions: {
        Args: {
          city_param?: string
          district_param?: string
          good_with_kids_param?: boolean
          good_with_pets_param?: boolean
          limits?: number
          neutered_param?: boolean
          offsets?: number
          owner_user_id_param?: string
          pet_ages_filter_param?: Database["public"]["Enums"]["pet_age"][]
          pet_genders_filter_param?: Database["public"]["Enums"]["pet_gender"][]
          pet_sizes_filter_param?: Database["public"]["Enums"]["pet_size"][]
          pet_types_filter_param?: Database["public"]["Enums"]["pet_type"][]
          search_param?: string
          sources_filter_param?: Database["public"]["Enums"]["adoption_source"][]
          vaccinated_param?: boolean
        }
        Returns: {
          adopted: boolean
          age: Database["public"]["Enums"]["pet_age"]
          application_questions: Json
          breed: string
          city: string
          comment_enabled: boolean
          created_at: string
          description: string
          dist_meters: number
          district: string
          extra_info: Json
          gender: Database["public"]["Enums"]["pet_gender"]
          good_with_kids: boolean
          good_with_pets: boolean
          id: string
          images: string[]
          lat: number
          lifecycle_last_activity_at: string
          long: number
          neutered: boolean
          size: Database["public"]["Enums"]["pet_size"]
          source: Database["public"]["Enums"]["adoption_source"]
          status: Database["public"]["Enums"]["pet_adoption_status"]
          title: string
          type: Database["public"]["Enums"]["pet_type"]
          updated_at: string
          user: Json
          user_id: string
          vaccinated: boolean
          videos: string[]
        }[]
      }
      browse_emergency_cases: {
        Args: {
          city_param?: string
          district_param?: string
          kind_param?: Database["public"]["Enums"]["emergency_kind"][]
          limits: number
          offsets: number
          reporter_user_id_param?: string
          search_param?: string
          status_param?: Database["public"]["Enums"]["emergency_status"][]
        }
        Returns: {
          city: string
          claimed_at: string
          claimed_by: string
          created_at: string
          description: string
          district: string
          id: string
          kind: Database["public"]["Enums"]["emergency_kind"]
          lat: number
          long: number
          pet_type: Database["public"]["Enums"]["pet_type"]
          photo_url: string
          reporter: Json
          reporter_user_id: string
          resolved_at: string
          status: Database["public"]["Enums"]["emergency_status"]
        }[]
      }
      browse_lost_found: {
        Args: {
          city_param?: string
          color_param?: string[]
          district_param?: string
          limits?: number
          offsets?: number
          owner_user_id_param?: string
          reward_only?: boolean
          search_param?: string
          status_param?: Database["public"]["Enums"]["lf_status"][]
          type_param?: Database["public"]["Enums"]["pet_type"][]
        }
        Returns: {
          breed: string
          city: string
          color: string
          created_at: string
          description: string
          dist_meters: number
          district: string
          gender: Database["public"]["Enums"]["pet_gender"]
          id: string
          images: string[]
          lat: number
          long: number
          lost_date: string
          reward_amount: number
          reward_offered: boolean
          status: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
          user: Json
          user_id: string
        }[]
      }
      bump_adoption_activity: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      bump_lost_found_activity: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      can_dm: { Args: { target: string }; Returns: boolean }
      chip_matches: {
        Args: { p_anchor_id: string }
        Returns: {
          breed: string
          city: string
          color: string
          created_at: string
          description: string
          dist_meters: number
          district: string
          eligible_for_push: boolean
          gender: Database["public"]["Enums"]["pet_gender"]
          id: string
          images: string[]
          lat: number
          locality: string
          long: number
          lost_date: string
          match_reasons: string[]
          score: number
          status: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
          user: Json
          user_id: string
        }[]
      }
      claim_emergency_case: { Args: { case_id: string }; Returns: boolean }
      claim_match_push: {
        Args: {
          p_bypass_daily_cap?: boolean
          p_new_lf_id: string
          p_notified_lf_id: string
          p_policy_version: number
          p_user_id: string
        }
        Returns: boolean
      }
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
      discussion_answer_set_correct: {
        Args: { answer_id_param: string; discussion_id_param: string }
        Returns: undefined
      }
      emergency_cases_in_bounds: {
        Args: {
          kind_param?: Database["public"]["Enums"]["emergency_kind"][]
          max_lat: number
          max_long: number
          min_lat: number
          min_long: number
          status_param?: Database["public"]["Enums"]["emergency_status"][]
        }
        Returns: {
          city: string
          claimed_at: string
          claimed_by: string
          created_at: string
          description: string
          district: string
          id: string
          kind: Database["public"]["Enums"]["emergency_kind"]
          lat: number
          long: number
          pet_type: Database["public"]["Enums"]["pet_type"]
          photo_url: string
          reporter: Json
          reporter_user_id: string
          resolved_at: string
          status: Database["public"]["Enums"]["emergency_status"]
        }[]
      }
      emit_notification: {
        Args: {
          p_body: string
          p_category: string
          p_data?: Json
          p_title: string
          p_type: string
          p_url: string
          p_user_id: string
        }
        Returns: Json
      }
      enforce_push_send_rate: {
        Args: { p_receiver: string; p_sender: string }
        Returns: boolean
      }
      export_user_data: { Args: { target_user_id: string }; Returns: Json }
      followers_posts: {
        Args: { current_user_id_param: string; limits: number; offsets: number }
        Returns: {
          bookmarked: boolean
          comment_enabled: boolean
          comments_count: number
          content: string
          created_at: string
          id: string
          images: string[]
          liked: boolean
          likes_count: number
          tags: string[]
          updated_at: string
          user: Json
          user_id: string
          videos: string[]
        }[]
      }
      get_adoption_by_id: {
        Args: { p_id: string }
        Returns: {
          adopted: boolean
          age: Database["public"]["Enums"]["pet_age"]
          application_questions: Json
          breed: string
          city: string
          comment_enabled: boolean
          created_at: string
          description: string
          dist_meters: number
          district: string
          extra_info: Json
          gender: Database["public"]["Enums"]["pet_gender"]
          good_with_kids: boolean
          good_with_pets: boolean
          id: string
          images: string[]
          lat: number
          lifecycle_last_activity_at: string
          long: number
          neutered: boolean
          size: Database["public"]["Enums"]["pet_size"]
          source: Database["public"]["Enums"]["adoption_source"]
          status: Database["public"]["Enums"]["pet_adoption_status"]
          title: string
          type: Database["public"]["Enums"]["pet_type"]
          updated_at: string
          user: Json
          user_id: string
          vaccinated: boolean
          videos: string[]
        }[]
      }
      get_adoption_comments: {
        Args: { p_adoption_id: string; p_limit: number; p_offset: number }
        Returns: {
          adoption_id: string
          comment: string
          created_at: string
          id: string
          updated_at: string
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
          bookmarked: boolean
          comments: Json
          comments_count: number
          content: string
          created_at: string
          discussion_id: string
          id: string
          points: number
          reports_count: number
          updated_at: string
          user: Json
          user_id: string
          voted_type: Database["public"]["Enums"]["discussion_answer_vote_type"]
        }[]
      }
      get_discussions: {
        Args: {
          current_user_id_param: string
          discussion_id_param?: string
          limits: number
          offsets: number
          owner_user_id_param?: string
          search_tag?: string
        }
        Returns: {
          answer: Json
          answer_id: string
          answers_count: number
          bookmarked: boolean
          category: Database["public"]["Enums"]["discussion_category"]
          content: string
          created_at: string
          id: string
          images: string[]
          points: number
          tags: string[]
          title: string
          updated_at: string
          user: Json
          user_id: string
          videos: string[]
          views_count: number
          voted_type: Database["public"]["Enums"]["discussion_vote_type"]
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
        SetofOptions: {
          from: "*"
          to: "discussions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_emergency_case_by_id: {
        Args: { case_id: string }
        Returns: {
          city: string
          claimed_at: string
          claimed_by: string
          created_at: string
          description: string
          district: string
          id: string
          kind: Database["public"]["Enums"]["emergency_kind"]
          lat: number
          long: number
          pet_type: Database["public"]["Enums"]["pet_type"]
          photo_url: string
          reporter: Json
          reporter_user_id: string
          resolved_at: string
          status: Database["public"]["Enums"]["emergency_status"]
        }[]
      }
      get_lost_found_by_id: {
        Args: { p_id: string }
        Returns: {
          breed: string
          city: string
          color: string
          description: string
          district: string
          gender: Database["public"]["Enums"]["pet_gender"]
          id: string
          images: string[]
          lost_date: string
          status: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
        }[]
      }
      get_lost_found_detail: {
        Args: { p_id: string }
        Returns: {
          breed: string
          city: string
          color: string
          created_at: string
          description: string
          dist_meters: number
          district: string
          gender: Database["public"]["Enums"]["pet_gender"]
          id: string
          images: string[]
          lat: number
          long: number
          lost_date: string
          reward_amount: number
          reward_offered: boolean
          status: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
          user: Json
          user_id: string
        }[]
      }
      get_lost_found_sightings: {
        Args: { lf_id_param: string }
        Returns: {
          chip_confirmed: boolean
          created_at: string
          id: string
          lat: number
          lng: number
          location_text: string
          note: string
          photo: string
          reporter_contact: string
          source: string
          user: Json
          user_id: string
        }[]
      }
      get_posts: {
        Args: {
          current_user_id_param: string
          limits: number
          offsets: number
          owner_user_id_param?: string
          post_id_param?: string
        }
        Returns: {
          bookmarked: boolean
          comment_enabled: boolean
          comments_count: number
          content: string
          created_at: string
          id: string
          images: string[]
          liked: boolean
          likes_count: number
          tags: string[]
          updated_at: string
          user: Json
          user_id: string
          videos: string[]
        }[]
      }
      insert_web_sighting: {
        Args: {
          p_cip_no: string
          p_location_text: string
          p_lost_found_id: string
          p_note: string
          p_photo: string
          p_reporter_contact: string
        }
        Returns: string
      }
      is_admin: { Args: { uid?: string }; Returns: boolean }
      is_banned: { Args: { uid: string }; Returns: boolean }
      is_block_between: { Args: { a: string; b: string }; Returns: boolean }
      is_discussion_answers_vote_by_user: {
        Args: { answers_ids: string[]; user_id_param: string }
        Returns: {
          answer_id: string
          type: Database["public"]["Enums"]["discussion_answer_vote_type"]
        }[]
      }
      is_discussion_vote_by_user: {
        Args: { discussion_ids: string[]; user_id_param: string }
        Returns: {
          discussion_id: string
          type: Database["public"]["Enums"]["discussion_vote_type"]
        }[]
      }
      is_posts_bookmarks_by_user: {
        Args: { post_ids_param: string[]; user_id_param: string }
        Returns: {
          is_bookmark: boolean
          post_id: string
        }[]
      }
      is_posts_likes_by_user: {
        Args: { post_ids_param: string[]; user_id_param: string }
        Returns: {
          is_liked: boolean
          post_id: string
        }[]
      }
      is_trusted_member: { Args: { p_id: string }; Returns: boolean }
      lf_like_escape: { Args: { p: string }; Returns: string }
      list_orphan_storage_objects: {
        Args: { target_bucket: string }
        Returns: {
          name: string
        }[]
      }
      list_user_storage_objects: {
        Args: { target_bucket: string; target_user_id: string }
        Returns: {
          name: string
        }[]
      }
      log_events: { Args: { events: Json }; Returns: undefined }
      lost_found_in_bounds: {
        Args: {
          city_param?: string
          color_param?: string[]
          district_param?: string
          limits?: number
          max_lat: number
          max_long: number
          min_lat: number
          min_long: number
          owner_user_id_param?: string
          search_param?: string
          status_param?: Database["public"]["Enums"]["lf_status"][]
          type_param?: Database["public"]["Enums"]["pet_type"][]
        }
        Returns: {
          breed: string
          city: string
          color: string
          created_at: string
          description: string
          dist_meters: number
          district: string
          gender: Database["public"]["Enums"]["pet_gender"]
          id: string
          images: string[]
          lat: number
          long: number
          lost_date: string
          reward_amount: number
          reward_offered: boolean
          status: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
          user: Json
          user_id: string
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_chat_notifications_read: {
        Args: { p_room_id: string }
        Returns: undefined
      }
      mark_notifications_read: { Args: { p_ids: number[] }; Returns: undefined }
      mark_reunited: {
        Args: {
          p_helper_user_id?: string
          p_listing_id: string
          p_via_patify: boolean
        }
        Returns: undefined
      }
      match_lost_found: {
        Args: {
          p_anchor_id: string
          p_limit?: number
          p_mode?: string
          p_radius_m?: number
        }
        Returns: {
          breed: string
          city: string
          color: string
          created_at: string
          description: string
          dist_meters: number
          district: string
          eligible_for_push: boolean
          gender: Database["public"]["Enums"]["pet_gender"]
          id: string
          images: string[]
          lat: number
          locality: string
          long: number
          lost_date: string
          match_reasons: string[]
          score: number
          status: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
          user: Json
          user_id: string
        }[]
      }
      my_trust_progress: { Args: never; Returns: Json }
      nearby_adoptions: {
        Args: {
          city_param?: string
          district_param?: string
          good_with_kids_param?: boolean
          good_with_pets_param?: boolean
          lat_param: number
          limits: number
          long_param: number
          max_distance_m_param?: number
          neutered_param?: boolean
          offsets: number
          owner_user_id_param?: string
          pet_ages_filter_param: Database["public"]["Enums"]["pet_age"][]
          pet_genders_filter_param: Database["public"]["Enums"]["pet_gender"][]
          pet_sizes_filter_param: Database["public"]["Enums"]["pet_size"][]
          pet_types_filter_param: Database["public"]["Enums"]["pet_type"][]
          search_param?: string
          sources_filter_param: Database["public"]["Enums"]["adoption_source"][]
          vaccinated_param?: boolean
        }
        Returns: {
          adopted: boolean
          age: Database["public"]["Enums"]["pet_age"]
          application_questions: Json
          breed: string
          city: string
          comment_enabled: boolean
          created_at: string
          description: string
          dist_meters: number
          district: string
          extra_info: Json
          gender: Database["public"]["Enums"]["pet_gender"]
          good_with_kids: boolean
          good_with_pets: boolean
          id: string
          images: string[]
          lat: number
          lifecycle_last_activity_at: string
          long: number
          neutered: boolean
          size: Database["public"]["Enums"]["pet_size"]
          source: Database["public"]["Enums"]["adoption_source"]
          status: Database["public"]["Enums"]["pet_adoption_status"]
          title: string
          type: Database["public"]["Enums"]["pet_type"]
          updated_at: string
          user: Json
          user_id: string
          vaccinated: boolean
          videos: string[]
        }[]
      }
      nearby_emergency_cases: {
        Args: {
          kind_param?: Database["public"]["Enums"]["emergency_kind"][]
          lat_param: number
          limits: number
          long_param: number
          max_distance_m_param?: number
          offsets: number
          status_param?: Database["public"]["Enums"]["emergency_status"][]
        }
        Returns: {
          city: string
          claimed_at: string
          claimed_by: string
          created_at: string
          description: string
          dist_meters: number
          district: string
          id: string
          kind: Database["public"]["Enums"]["emergency_kind"]
          lat: number
          long: number
          pet_type: Database["public"]["Enums"]["pet_type"]
          photo_url: string
          reporter: Json
          reporter_user_id: string
          resolved_at: string
          status: Database["public"]["Enums"]["emergency_status"]
        }[]
      }
      nearby_lost_found: {
        Args: {
          city_param?: string
          color_param?: string[]
          district_param?: string
          lat_param: number
          limits: number
          long_param: number
          max_distance_m_param?: number
          offsets: number
          owner_user_id_param?: string
          reward_only?: boolean
          search_param?: string
          status_param?: Database["public"]["Enums"]["lf_status"][]
          type_param?: Database["public"]["Enums"]["pet_type"][]
        }
        Returns: {
          breed: string
          city: string
          color: string
          created_at: string
          description: string
          dist_meters: number
          district: string
          gender: Database["public"]["Enums"]["pet_gender"]
          id: string
          images: string[]
          lat: number
          long: number
          lost_date: string
          reward_amount: number
          reward_offered: boolean
          status: Database["public"]["Enums"]["lf_status"]
          type: Database["public"]["Enums"]["pet_type"]
          user: Json
          user_id: string
        }[]
      }
      normalize_chip: { Args: { p: string }; Returns: string }
      process_adoption_lifecycle: { Args: never; Returns: undefined }
      process_emergency_lifecycle: { Args: never; Returns: undefined }
      process_lost_found_lifecycle: { Args: never; Returns: undefined }
      purge_stale_analytics: { Args: never; Returns: undefined }
      purge_user_analytics: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      reactivate_adoption: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      reactivate_lost_found: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      reserve_nearby_adoption_pushes: {
        Args: { p_cap?: number; p_city_norm: string; p_new_adoption_id: string }
        Returns: string[]
      }
      reserve_nearby_emergency_pushes: {
        Args: {
          p_cap?: number
          p_city_norm: string
          p_new_emergency_id: string
        }
        Returns: string[]
      }
      reserve_nearby_pushes: {
        Args: { p_cap?: number; p_city_norm: string; p_new_lf_id: string }
        Returns: string[]
      }
      resolve_emergency_case: { Args: { case_id: string }; Returns: boolean }
      reunion_helper_candidates: {
        Args: { p_listing_id: string }
        Returns: {
          created_at: string
          id: string
          profile_photo: string
          username: string
        }[]
      }
      set_analytics_consent: { Args: { enabled: boolean }; Returns: undefined }
      sighting_chip_confirms: {
        Args: { p_chip: string; p_lost_found_id: string }
        Returns: boolean
      }
      snap_public_location: {
        Args: { grid_deg: number; loc: unknown }
        Returns: unknown
      }
      snapshot_daily_metrics: { Args: never; Returns: undefined }
      trusted_member_flags: {
        Args: { p_ids: string[] }
        Returns: {
          is_trusted: boolean
          user_id: string
        }[]
      }
      try_reserve_lf_rebroadcast: {
        Args: { p_lf_id: string }
        Returns: boolean
      }
      unread_notification_count: { Args: never; Returns: number }
      update_discussions_table_views_count: {
        Args: { discussion_id: string }
        Returns: undefined
      }
      upsert_nearby_adoption_push_pref: {
        Args: {
          p_city: string
          p_consent_version: string
          p_district: string
          p_lat: number
          p_lng: number
          p_location_consent_version: string
          p_radius_m: number
        }
        Returns: undefined
      }
      upsert_nearby_emergency_push_pref: {
        Args: {
          p_city: string
          p_consent_version: string
          p_district: string
          p_lat: number
          p_lng: number
          p_location_consent_version: string
          p_radius_m: number
        }
        Returns: undefined
      }
      upsert_nearby_push_pref: {
        Args: {
          p_city: string
          p_consent_version: string
          p_district: string
          p_lat: number
          p_lng: number
          p_location_consent_version: string
          p_radius_m: number
        }
        Returns: undefined
      }
      username_exists: { Args: { p_username: string }; Returns: boolean }
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
      emergency_kind: "yarali" | "tehlikede" | "istismar" | "olu"
      emergency_status: "acik" | "ustlenildi" | "cozuldu" | "pasif"
      lf_status: "kayip" | "bulundu" | "cozuldu" | "pasif"
      pet_adoption_status: "open" | "closed" | "pasif"
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
        | "lost_found"
        | "lost_found_sightings"
      report_resolution:
        | "dismissed"
        | "warned"
        | "content_removed"
        | "user_banned"
      report_status: "pending" | "actioned" | "dismissed"
      report_type:
        | "spam"
        | "harassment"
        | "hate_speech"
        | "violence"
        | "nudity"
        | "false_information"
        | "other"
        | "sale_commercial_content"
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
      emergency_kind: ["yarali", "tehlikede", "istismar", "olu"],
      emergency_status: ["acik", "ustlenildi", "cozuldu", "pasif"],
      lf_status: ["kayip", "bulundu", "cozuldu", "pasif"],
      pet_adoption_status: ["open", "closed", "pasif"],
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
        "lost_found",
        "lost_found_sightings",
      ],
      report_resolution: [
        "dismissed",
        "warned",
        "content_removed",
        "user_banned",
      ],
      report_status: ["pending", "actioned", "dismissed"],
      report_type: [
        "spam",
        "harassment",
        "hate_speech",
        "violence",
        "nudity",
        "false_information",
        "other",
        "sale_commercial_content",
      ],
    },
  },
} as const
