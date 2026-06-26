"use client";

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { stripUndefined } from '@/lib/utils';
import { useToast } from './use-toast';

export type ResourceCategory = 'video' | 'document' | 'link';
export type ResourceSport = 'football' | 'tennis' | 'gym' | 'all';

export interface Resource {
  id: string;
  title: string;
  category: ResourceCategory;
  sport: ResourceSport;
  url: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface ResourceInput {
  title: string;
  category: ResourceCategory;
  sport: ResourceSport;
  url: string;
  description?: string;
}

export function useResources(category?: ResourceCategory) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Resource[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          data.push({
            id: docSnap.id,
            title: d.title,
            category: d.category,
            sport: d.sport || 'all',
            url: d.url,
            description: d.description,
            createdBy: d.createdBy,
            createdAt: d.createdAt,
          });
        });
        setResources(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching resources:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const addResource = async (input: ResourceInput) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await addDoc(collection(db, 'resources'), {
        ...stripUndefined(input),
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Resource added', description: `"${input.title}" has been added to the library.` });
    } catch (err) {
      console.error('Error adding resource:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add the resource.' });
    }
  };

  const deleteResource = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'resources', id));
      toast({ title: 'Resource removed', description: 'The resource has been deleted.' });
    } catch (err) {
      console.error('Error deleting resource:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the resource.' });
    }
  };

  const filtered = category ? resources.filter((r) => r.category === category) : resources;

  return { resources: filtered, isLoading, error, addResource, deleteResource };
}

export interface ResourceComment {
  id: string;
  text: string;
  timestampLabel: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
}

export function useResourceComments(resourceId: string | null) {
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!resourceId) {
      setComments([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const q = query(collection(db, 'resources', resourceId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: ResourceComment[] = [];
        snapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as ResourceComment);
        });
        setComments(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching comments:', err);
        setError(err);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [resourceId]);

  const addComment = async (text: string, timestampLabel: string) => {
    const user = auth.currentUser;
    if (!resourceId || !user) return;
    try {
      await addDoc(collection(db, 'resources', resourceId, 'comments'), {
        text,
        timestampLabel,
        createdBy: user.uid,
        createdByName: user.displayName || 'Coach',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding comment:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add the comment.' });
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!resourceId) return;
    try {
      await deleteDoc(doc(db, 'resources', resourceId, 'comments', commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the comment.' });
    }
  };

  return { comments, isLoading, error, addComment, deleteComment };
}
