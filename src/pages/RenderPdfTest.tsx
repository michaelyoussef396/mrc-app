/**
 * Phase 1 fidelity-test page. NOT linked from anywhere — reachable only by
 * navigating to /admin/render-test directly. Calls the /api/render-pdf
 * serverless function for a given inspectionId and downloads the PDF.
 *
 * Purpose: prove the server-side Chromium render matches the existing
 * browser-print "Save as PDF" output before wiring it into the email send
 * path (Phase 2). Side-by-side comparison is done manually by the admin —
 * see the inline instructions below.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function RenderPdfTest() {
  const [inspectionId, setInspectionId] = useState('');
  const [isRendering, setIsRendering] = useState(false);

  async function handleRender() {
    const trimmed = inspectionId.trim();
    if (!UUID_REGEX.test(trimmed)) {
      toast.error('Enter a valid inspection UUID');
      return;
    }

    setIsRendering(true);
    const toastId = 'render-pdf';
    toast.loading('Calling server renderer (Chromium cold-start ~5-15s)…', {
      id: toastId,
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error('No active session — please sign in again', { id: toastId });
        return;
      }

      const response = await fetch('/api/render-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ inspectionId: trimmed }),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error) detail = body.error;
        } catch {
          /* response wasn't JSON — keep the status */
        }
        toast.error(`Render failed: ${detail}`, { id: toastId });
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `server-render-${trimmed}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      toast.success(`Downloaded ${filename}`, { id: toastId });
    } catch (err) {
      console.error('[render-test] failed', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Render failed: ${msg}`, { id: toastId });
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Server-side PDF render — fidelity test
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Phase 1 endpoint. Renders the existing EF-produced inspection HTML
          to PDF via headless Chromium server-side, then downloads the result.
          NOT wired into the email send path — compare side-by-side with the
          existing Download → Save as PDF output before promoting to Phase 2.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="inspectionId" className="text-sm font-medium">
              Inspection ID (UUID)
            </Label>
            <Input
              id="inspectionId"
              type="text"
              placeholder="d58d3f11-3cf5-441c-8087-f01869ac7002"
              value={inspectionId}
              onChange={(e) => setInspectionId(e.target.value)}
              disabled={isRendering}
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Inspection must already have a generated HTML report (i.e.{' '}
              <code>pdf_url</code> populated).
            </p>
          </div>

          <Button
            onClick={handleRender}
            disabled={isRendering || !inspectionId.trim()}
            className="w-full min-h-[48px]"
          >
            {isRendering ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rendering…
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download server-rendered PDF
              </>
            )}
          </Button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          <p className="font-semibold mb-2">Comparison protocol</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>
              Open the inspection's existing report page (View Report / Download)
              and save the browser-print PDF for the same lead.
            </li>
            <li>Render via this page and download the server PDF.</li>
            <li>
              Compare side-by-side: page count, A4 portrait dimensions, fonts
              (Garet Heavy / Galvji), SVG backgrounds, navy box geometry, photo
              placement, colour fidelity.
            </li>
            <li>
              Confirm WHAT YOU GET is absent from both (sanity check on EF v87).
            </li>
            <li>
              If any gate fails: stop, report the gap. Do not promote to Phase 2.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
