import React, { Suspense } from 'react';
import CollectionSidebar from './CollectionSidebar';
import { createClient } from '@/utils/supabase/server';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Brosur ${decodeURIComponent(resolvedParams.slug)}`,
  };
}

export default async function SlugLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug);
  const supabase = await createClient();
  
  const searchSlug = slug.replace('BAP-(Brosur-Ahad-Pagi)-', '').trim();
  
  const { data: brosur } = await supabase
    .from('brosur')
    .select('slug, folder_id')
    .ilike('slug', `%${searchSlug}%`)
    .limit(1)
    .maybeSingle();

  let brosurList: any[] = [];
  let folderSlug = '';
  
  if (brosur && brosur.folder_id) {
    // Fetch all brosur with pagination to bypass Supabase 1000 rows limit
    let allBrosur: any[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: list } = await supabase
        .from('brosur')
        .select('judul, slug, tahun')
        .eq('folder_id', brosur.folder_id)
        .order('tahun', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (list && list.length > 0) {
        allBrosur = [...allBrosur, ...list];
      }
      
      if (!list || list.length < pageSize) {
        break;
      }
      page++;
    }
    
    if (allBrosur.length > 0) brosurList = allBrosur;
    
    const { data: folder } = await supabase
      .from('folders')
      .select('slug')
      .eq('id', brosur.folder_id)
      .single();
    if (folder) folderSlug = folder.slug;
  }

  return (
    <div className="h-[100dvh] print:h-auto print:overflow-visible flex flex-col lg:flex-row w-full relative overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]">
      {brosur?.folder_id && (
        <Suspense fallback={<div className="w-[320px] bg-white dark:bg-zinc-900 border-r border-black/5 dark:border-white/5" />}>
          <CollectionSidebar 
            brosurList={brosurList} 
            activeSlug={brosur.slug} 
            folderSlug={folderSlug} 
            folderId={brosur.folder_id}
          />
        </Suspense>
      )}

      {children}
    </div>
  );
}
