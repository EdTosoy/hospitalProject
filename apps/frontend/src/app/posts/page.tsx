import React from 'react';

interface Post {
    id: number;
    title: string;
    content: string | null;
    published: boolean;
    authorId: number | null;
}

export default async function PostsPage() {
    // Fetch data from the NestJS backend
    const res = await fetch('http://127.0.0.1:3000/posts', { cache: 'no-store' });

    if (!res.ok) {
        throw new Error('Failed to fetch posts');
    }

    const posts: Post[] = await res.json();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Posts</h1>
            <div className="grid gap-4">
                {posts.map((post) => (
                    <div key={post.id} className="border p-4 rounded shadow">
                        <h2 className="text-xl font-semibold">{post.title}</h2>
                        <p className="text-gray-600 mt-2">{post.content ?? 'No content'}</p>
                        <div className="mt-4 text-sm text-gray-400">
                            ID: {post.id}
                        </div>
                    </div>
                ))}
            </div>
            {posts.length === 0 && (
                <p className="text-gray-500">No posts found.</p>
            )}
        </div>
    );
}
