export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    facebook_ads_manager: {
        Tables: {
            profiles: {
                Row: {
                    id: number
                    full_name: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    full_name?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    full_name?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            business_managers: {
                Row: {
                    id: number
                    name: string
                    business_manager_id: string
                    access_token: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    business_manager_id: string
                    access_token?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    business_manager_id?: string
                    access_token?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            ad_accounts: {
                Row: {
                    id: number
                    business_manager_id: number
                    account_id: string
                    account_name: string
                    currency: string
                    timezone_name: string
                    status: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    business_manager_id: number
                    account_id: string
                    account_name: string
                    currency?: string
                    timezone_name?: string
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    business_manager_id?: number
                    account_id?: string
                    account_name?: string
                    currency?: string
                    timezone_name?: string
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            campaigns: {
                Row: {
                    id: number
                    ad_account_id: number
                    name: string
                    objective: string
                    status: string
                    daily_budget: number | null
                    lifetime_budget: number | null
                    bid_strategy: string
                    start_time: string | null
                    end_time: string | null
                    facebook_campaign_id: string | null
                    sync_status: string
                    sync_error: string | null
                    last_synced_at: string | null
                    budget_type: string
                    special_ad_categories: string[]
                    execution_id: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    ad_account_id: number
                    name: string
                    objective: string
                    status?: string
                    daily_budget?: number | null
                    lifetime_budget?: number | null
                    bid_strategy?: string
                    start_time?: string | null
                    end_time?: string | null
                    facebook_campaign_id?: string | null
                    sync_status?: string
                    sync_error?: string | null
                    budget_type?: string
                    special_ad_categories?: string[]
                    execution_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    ad_account_id?: number
                    name?: string
                    objective?: string
                    status?: string
                    daily_budget?: number | null
                    lifetime_budget?: number | null
                    bid_strategy?: string
                    start_time?: string | null
                    end_time?: string | null
                    facebook_campaign_id?: string | null
                    sync_status?: string
                    sync_error?: string | null
                    budget_type?: string
                    special_ad_categories?: string[]
                    execution_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            ad_sets: {
                Row: {
                    id: number
                    campaign_id: number
                    name: string
                    status: string
                    targeting_countries: string[]
                    age_min: number
                    age_max: number
                    genders: number[]
                    daily_budget: number | null
                    start_time: string | null
                    end_time: string | null
                    facebook_adset_id: string | null
                    sync_status: string
                    sync_error: string | null
                    execution_id: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    campaign_id: number
                    name: string
                    status?: string
                    targeting_countries?: string[]
                    age_min?: number
                    age_max?: number
                    genders?: number[]
                    daily_budget?: number | null
                    execution_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    campaign_id?: number
                    name?: string
                    status?: string
                    targeting_countries?: string[]
                    age_min?: number
                    age_max?: number
                    genders?: number[]
                    daily_budget?: number | null
                    execution_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            ads: {
                Row: {
                    id: number
                    ad_set_id: number
                    name: string
                    status: string
                    headline: string | null
                    primary_text: string | null
                    call_to_action: string
                    link_url: string | null
                    video_drive_url: string | null
                    video_facebook_id: string | null
                    thumbnail_url: string | null
                    facebook_ad_id: string | null
                    sync_status: string
                    sync_error: string | null
                    execution_id: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    ad_set_id: number
                    name: string
                    status?: string
                    headline?: string | null
                    primary_text?: string | null
                    call_to_action?: string
                    link_url?: string | null
                    video_drive_url?: string | null
                    execution_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    ad_set_id?: number
                    name?: string
                    status?: string
                    headline?: string | null
                    primary_text?: string | null
                    call_to_action?: string
                    link_url?: string | null
                    video_drive_url?: string | null
                    execution_id?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            pixels: {
                Row: {
                    id: number
                    business_manager_id: number
                    name: string
                    pixel_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    business_manager_id: number
                    name: string
                    pixel_id: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    business_manager_id?: number
                    name?: string
                    pixel_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            ad_pages: {
                Row: {
                    id: number
                    business_manager_id: number
                    page_id: string
                    name: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    business_manager_id: number
                    page_id: string
                    name: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    business_manager_id?: number
                    page_id?: string
                    name?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            instagram_accounts: {
                Row: {
                    id: number
                    business_manager_id: number
                    ad_page_id: number | null
                    instagram_actor_id: string
                    name: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    business_manager_id: number
                    ad_page_id?: number | null
                    instagram_actor_id: string
                    name: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    business_manager_id?: number
                    ad_page_id?: number | null
                    instagram_actor_id?: string
                    name?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            websites: {
                Row: {
                    id: number
                    business_manager_id: number
                    name: string
                    url: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    business_manager_id: number
                    name: string
                    url: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    business_manager_id?: number
                    name?: string
                    url?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            bulk_templates: {
                Row: {
                    id: number
                    name: string
                    description: string | null
                    config: Record<string, unknown>
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    description?: string | null
                    config: Record<string, unknown>
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    description?: string | null
                    config?: Record<string, unknown>
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            bulk_executions: {
                Row: {
                    id: number
                    name: string
                    status: string
                    total_campaigns: number
                    total_adsets: number
                    total_ads: number
                    error_message: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    status?: string
                    total_campaigns?: number
                    total_adsets?: number
                    total_ads?: number
                    error_message?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    status?: string
                    total_campaigns?: number
                    total_adsets?: number
                    total_ads?: number
                    error_message?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            advideos_tasks: {
                Row: {
                    id: number
                    video_drive_id: string
                    video_name: string | null
                    meta_video_id: string | null
                    status: string
                    execution_id: number | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    video_drive_id: string
                    video_name?: string | null
                    meta_video_id?: string | null
                    status?: string
                    execution_id?: number | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    video_drive_id?: string
                    video_name?: string | null
                    meta_video_id?: string | null
                    status?: string
                    execution_id?: number | null
                    created_at?: string
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