import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://gcfyookdsujabsfektuo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZnlvb2tkc3VqYWJzZmVrdHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwMzU1NTAsImV4cCI6MjA1NDYxMTU1MH0.Ha3fFLAIK_WrHAqFgrv_ooDoVUTOrfp8asT9yWEbXfo';
export const supabase = createClient(supabaseUrl, supabaseKey)  
console.log('Supabase conectado:', supabase);