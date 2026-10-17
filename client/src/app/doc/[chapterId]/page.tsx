import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Reader } from '@/components/reader/Reader';
import { api } from '@/lib/api';
import {
  LANGUAGE_VIETNAMESE,
  chapterLabel,
  languageLabel,
  localizedTitle,
} from '@/lib/format';
import { initRequestContext } from '@/lib/site';

export const dynamic = 'force-dynamic';

async function loadChapter(chapterId: string) {
  try {
    const response = await api.chapter(chapterId);
    return response.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}): Promise<Metadata> {
  const { chapterId } = await params;
  const chapter = await loadChapter(chapterId);
  if (!chapter) return { title: 'Không tìm thấy chương' };

  const mangaRel = chapter.relationships?.find((rel) => rel.type === 'manga');
  const mangaTitle = localizedTitle(mangaRel?.attributes?.title);
  const label = chapterLabel(chapter.attributes);

  return {
    title: `${label} — ${mangaTitle}`,
    description: `Đọc ${label} của ${mangaTitle} — bản ${languageLabel(chapter.attributes.translatedLanguage).toLowerCase()}.`,
    alternates: { canonical: `/doc/${chapterId}` },
    robots: { index: false, follow: true },
  };
}

export default async function ReaderPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  await initRequestContext();

  const chapter = await loadChapter(chapterId);
  if (!chapter) notFound();

  const mangaRel = chapter.relationships?.find((rel) => rel.type === 'manga');
  const groupRel = chapter.relationships?.find((rel) => rel.type === 'scanlation_group');
  const language = chapter.attributes.translatedLanguage;

  const pages = await api.chapterPages(chapterId, 'data').catch(() => null);

  const feed = mangaRel?.id
    ? await api.chapterFeed(mangaRel.id, undefined, 500, 0).catch(() => null)
    : null;

  // Ưu tiên danh sách chương bản Việt để "chương trước / chương sau" đi đúng nhánh
  // mà người đọc đang theo dõi.
  const list = feed?.data ?? [];
  const ordered = [...list].sort((a, b) => {
    const langA = a.attributes.translatedLanguage === LANGUAGE_VIETNAMESE ? 0 : 1;
    const langB = b.attributes.translatedLanguage === LANGUAGE_VIETNAMESE ? 0 : 1;
    if (langA !== langB) return langA - langB;
    return (a.attributes.chapter ?? '').localeCompare(b.attributes.chapter ?? '', undefined, {
      numeric: true,
    });
  });

  const index = ordered.findIndex((item) => item.id === chapterId);
  const prev = index > 0 ? { id: ordered[index - 1].id, label: chapterLabel(ordered[index - 1].attributes) } : null;
  const next =
    index >= 0 && index < ordered.length - 1
      ? { id: ordered[index + 1].id, label: chapterLabel(ordered[index + 1].attributes) }
      : null;

  // Tìm bản Việt hoá của chính chương đang mở, để gợi ý chuyển sang nếu có.
  const vietnameseChapter =
    language === LANGUAGE_VIETNAMESE
      ? null
      : (list.find(
          (item) =>
            item.attributes.translatedLanguage === LANGUAGE_VIETNAMESE &&
            item.attributes.chapter === chapter.attributes.chapter &&
            item.attributes.volume === chapter.attributes.volume &&
            item.id !== chapterId,
        )?.id ?? null);

  const manga = mangaRel?.id
    ? await api.mangaDetail(mangaRel.id).then((response) => response.data).catch(() => null)
    : null;

  const coverFileName =
    manga?.relationships?.find((rel) => rel.type === 'cover_art')?.attributes?.fileName;

  return (
    <Reader
      chapterId={chapterId}
      chapterLabelValue={chapterLabel(chapter.attributes)}
      chapterTitle={chapter.attributes.title ?? ''}
      language={language}
      vietnameseChapterId={vietnameseChapter}
      mangaId={mangaRel?.id ?? ''}
      mangaTitle={localizedTitle(mangaRel?.attributes?.title)}
      coverFileName={coverFileName}
      groupName={localizedTitle(groupRel?.attributes?.name)}
      groupWebsite={groupRel?.attributes?.website ?? ''}
      totalPages={pages?.total ?? 0}
      pages={pages?.pages ?? []}
      prevChapter={prev}
      nextChapter={next}
      hasPages={Boolean(pages && pages.pages.length > 0)}
    />
  );
}