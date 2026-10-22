'use client';

import { useEffect, useRef, useState } from 'react';
import {
  fileDownloadPath,
  filePreviewPath,
  filePreviewType,
  type RepositoryFile,
} from '@/lib/file-repository';
import { RepoIcon } from './RepositoryShared';

export default function RepositoryPreview({
  file,
  onClose,
}: {
  file: RepositoryFile;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  function closePreview() {
    dialog.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      className="repo-preview"
      aria-labelledby="repo-preview-title"
      onCancel={(event) => {
        event.preventDefault();
        closePreview();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closePreview();
      }}
    >
      <div className="repo-preview-panel">
        <div className="repo-preview-heading">
          <h2 id="repo-preview-title">{file.name}</h2>
          <button
            type="button"
            className="repo-button"
            aria-label="Close preview"
            onClick={closePreview}
          >
            <RepoIcon kind="close" />
          </button>
        </div>
        <div className="repo-preview-media">
          {failed ? (
            <p role="alert">
              This file could not be previewed in your browser. Download it to open it on your
              device.
            </p>
          ) : filePreviewType(file.name)?.startsWith('video/') ? (
            <video
              src={filePreviewPath(file.id)}
              controls
              playsInline
              preload="metadata"
              aria-label={`Preview ${file.name}`}
              onError={() => setFailed(true)}
            />
          ) : (
            // Original repository images stream through the same-origin preview API.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={filePreviewPath(file.id)} alt={file.name} onError={() => setFailed(true)} />
          )}
        </div>
        <div className="repo-preview-footer">
          {file.description && <p>{file.description}</p>}
          <a
            className="repo-download"
            href={fileDownloadPath(file.id)}
            download={file.name}
            aria-label={`Download ${file.name}`}
          >
            Download <RepoIcon kind="download" />
          </a>
        </div>
      </div>
    </dialog>
  );
}
