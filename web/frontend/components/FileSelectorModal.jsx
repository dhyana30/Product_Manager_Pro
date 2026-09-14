import React, { useState, useEffect } from 'react';
import { Modal, Text, Spinner, TextField, Icon } from '@shopify/polaris';
import { SearchMinor } from '@shopify/polaris-icons';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

export function FileSelectorModal({ open, onClose, onSelect }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open]);

  const loadFiles = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      const payload = await response.json();
      setFiles(payload.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiles = files.filter((file) => {
    const searchText = search.toLowerCase().trim();
    if (!searchText) return true;
    return [file.url, file.altText, file.productTitle, file.source]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(searchText));
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select existing image"
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
      large
    >
      <Modal.Section>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size="large" />
          </div>
        ) : error ? (
          <Text color="critical">{error}</Text>
        ) : files.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Text color="subdued">No images found in your Shopify Admin files.</Text>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <TextField
                value={search}
                onChange={setSearch}
                placeholder="Search files"
                clearButton
                onClearButtonClick={() => setSearch('')}
                prefix={<Icon source={SearchMinor} />}
                autoComplete="off"
              />
            </div>
            {filteredFiles.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Text color="subdued">No files match your search.</Text>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {filteredFiles.map((file) => {
              let name = 'Unknown';
              let ext = '';
              try {
                const pathname = new URL(file.url).pathname;
                const filenameWithExt = pathname.substring(pathname.lastIndexOf('/') + 1);
                const dotIndex = filenameWithExt.lastIndexOf('.');
                if (dotIndex !== -1) {
                  name = filenameWithExt.substring(0, dotIndex);
                  ext = filenameWithExt.substring(dotIndex + 1).toUpperCase();
                } else {
                  name = filenameWithExt;
                }
              } catch (e) {
                // Ignore URL parsing errors
              }

              return (
                <div 
                  key={file.id} 
                  onClick={() => onSelect(file)}
                  style={{ 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{
                    border: '1px solid #dfe3e8',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    aspectRatio: '1',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb'
                  }}>
                    <img 
                      src={file.url} 
                      alt={file.altText || name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div style={{ textAlign: 'center', width: '100%', overflow: 'hidden' }}>
                    <Text variant="bodySm" as="p" truncate>{name}</Text>
                    {file.productTitle && <Text variant="bodySm" as="p" color="subdued" truncate>{file.productTitle}</Text>}
                    {file.source && <Text variant="bodySm" as="p" color="subdued">{file.source}</Text>}
                    {ext && <Text variant="bodySm" as="p" color="subdued">{ext}</Text>}
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </>
        )}
      </Modal.Section>
    </Modal>
  );
}
