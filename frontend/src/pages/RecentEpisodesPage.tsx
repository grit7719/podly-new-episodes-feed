import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { feedsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { PagedResult, RecentEpisode } from '../types';
import PlayButton from '../components/PlayButton';
import DownloadButton from '../components/DownloadButton';
import EpisodeProcessingStatus from '../components/EpisodeProcessingStatus';

const PAGE_SIZE = 50;

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.floor(diffMs / dayMs);
  if (days < 1) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    return `${hours}h ago`;
  }
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function RecentEpisodesPage() {
  const { requireAuth, user } = useAuth();
  const isAdmin = !requireAuth || user?.role === 'admin';
  const whitelistedOnly = requireAuth && !isAdmin;
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery<PagedResult<RecentEpisode>>({
    queryKey: ['recent-episodes', page, whitelistedOnly],
    queryFn: () =>
      feedsApi.getRecentEpisodes({
        page,
        pageSize: PAGE_SIZE,
        whitelistedOnly,
      }),
    placeholderData: (prev) => prev,
  });

  const totalPages = data?.total_pages ?? 0;

  // Group episodes by release date (day boundary)
  const grouped = useMemo(() => {
    const groups: { label: string; episodes: RecentEpisode[] }[] = [];
    let lastLabel: string | null = null;
    for (const ep of data?.items ?? []) {
      const label = ep.release_date
        ? new Date(ep.release_date).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Undated';
      if (label !== lastLabel) {
        groups.push({ label, episodes: [] });
        lastLabel = label;
      }
      groups[groups.length - 1].episodes.push(ep);
    }
    return groups;
  }, [data?.items]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading recent episodes. Please try again.</p>
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Episodes</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No episodes yet. Subscribe to a feed to see episodes here.</p>
          <Link
            to="/"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Browse feeds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Recent Episodes</h2>
        {isFetching && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        )}
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <section key={group.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
              {group.label}
            </h3>
            <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {group.episodes.map((ep) => (
                <li key={ep.guid} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-3 sm:gap-4">
                    {ep.feed_image_url || ep.image_url ? (
                      <img
                        src={ep.image_url || ep.feed_image_url || ''}
                        alt=""
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-md object-cover flex-shrink-0 bg-gray-100"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-md bg-gray-200 flex-shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span className="truncate font-medium text-gray-700">
                          {ep.feed_title ?? 'Unknown feed'}
                        </span>
                        <span>·</span>
                        <span className="flex-shrink-0">{formatRelativeDate(ep.release_date)}</span>
                        {formatDuration(ep.duration) && (
                          <>
                            <span>·</span>
                            <span className="flex-shrink-0">{formatDuration(ep.duration)}</span>
                          </>
                        )}
                      </div>

                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                        {ep.title}
                      </h4>

                      <div className="flex items-center gap-2 flex-wrap">
                        <PlayButton episode={ep} />
                        <DownloadButton
                          episodeGuid={ep.guid}
                          isWhitelisted={ep.whitelisted}
                          hasProcessedAudio={ep.has_processed_audio}
                          feedId={ep.feed_id}
                          canModifyEpisodes={isAdmin || !requireAuth}
                        />
                        <EpisodeProcessingStatus
                          episodeGuid={ep.guid}
                          isWhitelisted={ep.whitelisted}
                          hasProcessedAudio={ep.has_processed_audio}
                          feedId={ep.feed_id}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Newer
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Older
          </button>
        </div>
      )}
    </div>
  );
}
