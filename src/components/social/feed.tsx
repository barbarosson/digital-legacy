"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, ImagePlus, MessageCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n/provider";
import { useSocialAuth } from "@/lib/social/auth-context";
import { getSupabase } from "@/lib/supabase/client";
import type { Post, PostComment, Profile } from "@/lib/social/types";
import { cn } from "@/lib/utils";

type FeedPost = Post & {
  authorProfile: Profile | null;
  likeCount: number;
  liked: boolean;
  commentCount: number;
};

export function Feed() {
  const t = useT();
  const { profile, session } = useSocialAuth();
  const userId = session?.user?.id ?? null;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    setLoading(true);

    const { data: postRows } = await supabase
      .from("dm_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (postRows as Post[]) ?? [];

    const authorIds = Array.from(new Set(list.map((p) => p.author)));
    const postIds = list.map((p) => p.id);

    const [{ data: profRows }, { data: reactRows }, { data: commentRows }] =
      await Promise.all([
        authorIds.length
          ? supabase.from("dm_profiles").select("*").in("id", authorIds)
          : Promise.resolve({ data: [] as Profile[] }),
        postIds.length
          ? supabase
              .from("dm_post_reactions")
              .select("post_id, user_id")
              .in("post_id", postIds)
          : Promise.resolve({ data: [] as { post_id: number; user_id: string }[] }),
        postIds.length
          ? supabase.from("dm_post_comments").select("post_id").in("post_id", postIds)
          : Promise.resolve({ data: [] as { post_id: number }[] }),
      ]);

    const profMap = new Map<string, Profile>();
    for (const p of (profRows as Profile[]) ?? []) profMap.set(p.id, p);

    const likeCounts = new Map<number, number>();
    const likedSet = new Set<number>();
    for (const r of (reactRows as { post_id: number; user_id: string }[]) ?? []) {
      likeCounts.set(r.post_id, (likeCounts.get(r.post_id) ?? 0) + 1);
      if (r.user_id === userId) likedSet.add(r.post_id);
    }

    const commentCounts = new Map<number, number>();
    for (const c of (commentRows as { post_id: number }[]) ?? []) {
      commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1);
    }

    setPosts(
      list.map((p) => ({
        ...p,
        authorProfile: profMap.get(p.author) ?? null,
        likeCount: likeCounts.get(p.id) ?? 0,
        liked: likedSet.has(p.id),
        commentCount: commentCounts.get(p.id) ?? 0,
      })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function share() {
    const supabase = getSupabase();
    if (!supabase || !userId || (!content.trim() && !imageFile)) return;
    setSharing(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const path = `${userId}/${Date.now()}-${imageFile.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("dm-social")
        .upload(path, imageFile, { upsert: false });
      if (!upErr) {
        imageUrl = supabase.storage.from("dm-social").getPublicUrl(path).data
          .publicUrl;
      }
    }

    const { error } = await supabase.from("dm_posts").insert({
      author: userId,
      content: content.trim(),
      image_url: imageUrl,
    });
    setSharing(false);
    if (!error) {
      setContent("");
      clearImage();
      load();
    }
  }

  async function toggleLike(post: FeedPost) {
    const supabase = getSupabase();
    if (!supabase || !userId) return;

    setPosts((current) =>
      current.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked: !p.liked,
              likeCount: p.likeCount + (p.liked ? -1 : 1),
            }
          : p,
      ),
    );

    if (post.liked) {
      await supabase
        .from("dm_post_reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId);
    } else {
      await supabase
        .from("dm_post_reactions")
        .insert({ post_id: post.id, user_id: userId });
    }
  }

  async function deletePost(post: FeedPost) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("dm_posts").delete().eq("id", post.id);
    setPosts((current) => current.filter((p) => p.id !== post.id));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("social.composerPlaceholder")}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
          />
          {imagePreview && (
            <div className="relative mt-3 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt=""
                className="max-h-48 rounded-xl border border-slate-800"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-slate-950/80 p-1 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={pickImage}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {t("social.addImage")}
            </Button>
            <Button
              type="button"
              onClick={share}
              disabled={sharing || (!content.trim() && !imageFile)}
            >
              {sharing ? t("social.sharing") : t("social.share")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500">{t("social.loading")}</p>
      ) : posts.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">
          {t("social.emptyFeed")}
        </p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentProfile={profile}
            currentUserId={userId}
            onToggleLike={() => toggleLike(post)}
            onDelete={() => deletePost(post)}
            onCommentAdded={() =>
              setPosts((current) =>
                current.map((p) =>
                  p.id === post.id
                    ? { ...p, commentCount: p.commentCount + 1 }
                    : p,
                ),
              )
            }
          />
        ))
      )}
    </div>
  );
}

function PostCard({
  post,
  currentProfile,
  currentUserId,
  onToggleLike,
  onDelete,
  onCommentAdded,
}: {
  post: FeedPost;
  currentProfile: Profile | null;
  currentUserId: string | null;
  onToggleLike: () => void;
  onDelete: () => void;
  onCommentAdded: () => void;
}) {
  const t = useT();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<
    (PostComment & { authorName: string })[]
  >([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const authorName =
    post.author === currentUserId
      ? t("social.you")
      : post.authorProfile?.display_name ?? t("social.someone");

  async function loadComments() {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoadingComments(true);
    const { data } = await supabase
      .from("dm_post_comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    const rows = (data as PostComment[]) ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.author)));
    const nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("dm_profiles")
        .select("id, display_name")
        .in("id", ids);
      for (const p of (profs as { id: string; display_name: string }[]) ?? []) {
        nameMap.set(p.id, p.display_name);
      }
    }
    setComments(
      rows.map((r) => ({
        ...r,
        authorName:
          r.author === currentUserId
            ? t("social.you")
            : nameMap.get(r.author) ?? t("social.someone"),
      })),
    );
    setLoadingComments(false);
  }

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  }

  async function addComment() {
    const supabase = getSupabase();
    if (!supabase || !currentUserId || !commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    const { data } = await supabase
      .from("dm_post_comments")
      .insert({ post_id: post.id, author: currentUserId, content: text })
      .select("*")
      .single();
    if (data) {
      setComments((current) => [
        ...current,
        {
          ...(data as PostComment),
          authorName: currentProfile?.display_name ?? t("social.you"),
        },
      ]);
      onCommentAdded();
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-300">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {authorName}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          {post.author === currentUserId && (
            <button
              type="button"
              onClick={onDelete}
              className="text-slate-500 transition hover:text-rose-400"
              aria-label={t("social.deletePost")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {post.content && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-200">
            {post.content}
          </p>
        )}
        {post.image_url && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt=""
              className="max-h-96 w-full rounded-xl border border-slate-800 object-cover"
            />
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 border-t border-slate-800/60 pt-3">
          <button
            type="button"
            onClick={onToggleLike}
            className={cn(
              "flex items-center gap-1.5 text-sm transition",
              post.liked
                ? "text-rose-400"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <Heart className={cn("h-4 w-4", post.liked && "fill-current")} />
            {post.likeCount > 0 ? post.likeCount : t("social.like")}
          </button>
          <button
            type="button"
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
          >
            <MessageCircle className="h-4 w-4" />
            {post.commentCount > 0 ? post.commentCount : t("social.comment")}
          </button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-3 border-t border-slate-800/60 pt-4">
            {loadingComments ? (
              <p className="text-xs text-slate-500">{t("social.loading")}</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="font-medium text-foreground">
                    {c.authorName}
                  </span>{" "}
                  <span className="text-slate-300">{c.content}</span>
                </div>
              ))
            )}
            <div className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addComment();
                }}
                placeholder={t("social.commentPlaceholder")}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-500/60"
              />
              <Button type="button" size="sm" onClick={addComment}>
                {t("social.send")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
