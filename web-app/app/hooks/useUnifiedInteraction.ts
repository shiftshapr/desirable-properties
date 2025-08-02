import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ElementData, DisplayData } from '../../lib/unifiedInteractionService';

interface UseUnifiedInteractionProps {
  elementId?: string;
  elementType: string;
  submissionId?: string;
  autoFetch?: boolean;
}

interface UseUnifiedInteractionReturn {
  element: DisplayData | null;
  elements: DisplayData[];
  loading: boolean;
  error: string | null;
  saveElement: (data: Partial<ElementData>) => Promise<void>;
  refreshElement: () => Promise<void>;
  refreshElements: () => Promise<void>;
  createModalLink: () => string;
  addEventListener: (eventType: 'click' | 'submit' | 'vote', handler: (event: any) => void) => () => void;
}

export function useUnifiedInteraction({
  elementId,
  elementType,
  submissionId,
  autoFetch = true,
}: UseUnifiedInteractionProps): UseUnifiedInteractionReturn {
  const { authenticated, getAccessToken } = usePrivy();
  const [element, setElement] = useState<DisplayData | null>(null);
  const [elements, setElements] = useState<DisplayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchElement = useCallback(async () => {
    if (!elementId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `/api/elements?elementId=${elementId}&elementType=${elementType}${submissionId ? `&submissionId=${submissionId}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch element');
      }

      const data = await response.json();
      setElement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch element');
    } finally {
      setLoading(false);
    }
  }, [elementId, elementType, submissionId, getAccessToken]);

  const fetchElements = useCallback(async () => {
    if (!submissionId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `/api/elements?submissionId=${submissionId}&elementType=${elementType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch elements');
      }

      const data = await response.json();
      setElements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch elements');
    } finally {
      setLoading(false);
    }
  }, [submissionId, elementType, getAccessToken]);

  const saveElement = useCallback(async (data: Partial<ElementData>) => {
    if (!authenticated) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const elementData: ElementData = {
        id: elementId || '',
        type: elementType as 'submission' | 'comment' | 'reaction',
        submissionId,
        ...data,
      };

      const response = await fetch('/api/elements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(elementData),
      });

      if (!response.ok) {
        throw new Error('Failed to save element');
      }

      const savedElement = await response.json();
      
      // Update local state
      if (elementId) {
        setElement(savedElement);
      } else {
        setElements(prev => [savedElement, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save element');
    } finally {
      setLoading(false);
    }
  }, [authenticated, elementId, elementType, submissionId, getAccessToken]);

  const createModalLink = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.themetalayer.org';
    
    switch (elementType) {
      case 'submission':
        return `${baseUrl}/submission/${elementId}`;
      case 'comment':
        return `${baseUrl}/submission/${submissionId}?comment=${elementId}`;
      case 'reaction':
        return `${baseUrl}/submission/${submissionId}?reaction=${elementId}`;
      default:
        return `${baseUrl}/submission/${submissionId}`;
    }
  }, [elementId, elementType, submissionId]);

  const addEventListener = useCallback((
    eventType: 'click' | 'submit' | 'vote',
    handler: (event: any) => void
  ) => {
    if (typeof window === 'undefined') return () => {};

    const element = document.querySelector(
      `[data-element-id="${elementId}"][data-element-type="${elementType}"]`
    );
    
    if (element) {
      element.addEventListener(eventType, handler);
      
      return () => {
        element.removeEventListener(eventType, handler);
      };
    }
    
    return () => {};
  }, [elementId, elementType]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (!autoFetch) return;

    if (elementId) {
      fetchElement();
    } else if (submissionId) {
      fetchElements();
    }
  }, [autoFetch, elementId, submissionId, fetchElement, fetchElements]);

  return {
    element,
    elements,
    loading,
    error,
    saveElement,
    refreshElement: fetchElement,
    refreshElements: fetchElements,
    createModalLink,
    addEventListener,
  };
} 