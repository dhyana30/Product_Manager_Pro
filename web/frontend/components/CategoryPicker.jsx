import React, { useState, useEffect, useCallback } from 'react';
import { Popover, ActionList, TextField, Icon, Spinner, Text, Stack, Button, Scrollable } from '@shopify/polaris';
import { SearchMinor, ChevronRightMinor, ArrowLeftMinor, SelectMinor } from '@shopify/polaris-icons';
import { useAuthenticatedFetch } from '../hooks';

export function CategoryPicker({ selectedCategory, onSelect }) {
  const [popoverActive, setPopoverActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Navigation state
  const [history, setHistory] = useState([]); // Array of parent nodes [{id, name}]
  const [nodes, setNodes] = useState([]);
  
  const fetchAPI = useAuthenticatedFetch();

  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    [],
  );
  
  const openPopover = useCallback(() => setPopoverActive(true), []);
  const closePopover = useCallback(() => setPopoverActive(false), []);

  const fetchRoots = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI('/api/taxonomy');
      const json = await res.json();
      const edges = json.data?.taxonomy?.categories?.edges || [];
      setNodes(edges.map(e => e.node));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchChildren = async (parentId) => {
    setLoading(true);
    try {
      const res = await fetchAPI(`/api/taxonomy?parentId=${encodeURIComponent(parentId)}`);
      const json = await res.json();
      const edges = json.data?.taxonomy?.categories?.edges || [];
      setNodes(edges.map(e => e.node));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const searchCategories = async (query) => {
    setLoading(true);
    try {
      const res = await fetchAPI(`/api/taxonomy?query=${encodeURIComponent(query)}`);
      const json = await res.json();
      const edges = json.data?.taxonomy?.categories?.edges || [];
      setNodes(edges.map(e => e.node));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (popoverActive) {
      if (searchQuery) {
        searchCategories(searchQuery);
      } else if (history.length === 0) {
        fetchRoots();
      } else {
        fetchChildren(history[history.length - 1].id);
      }
    }
  }, [popoverActive, searchQuery]);

  const handleSelectNode = (node) => {
    if (node.isLeaf) {
      onSelect(node.fullName || node.name);
      setPopoverActive(false);
    } else {
      setHistory([...history, { id: node.id, name: node.name }]);
      setSearchQuery('');
      fetchChildren(node.id);
    }
  };

  const handleBack = () => {
    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);
    setSearchQuery('');
    if (newHistory.length === 0) {
      fetchRoots();
    } else {
      fetchChildren(newHistory[newHistory.length - 1].id);
    }
  };

  const activator = (
    <div onClick={openPopover} style={{ cursor: 'pointer' }}>
      <TextField
        labelHidden
        label="Category"
        value={selectedCategory}
        placeholder="Choose a product category"
        autoComplete="off"
        readOnly
        onFocus={openPopover}
        clearButton={!!selectedCategory}
        onClearButtonClick={() => {
          onSelect('');
          setPopoverActive(false);
        }}
        suffix={!selectedCategory ? <Icon source={SelectMinor} /> : null}
      />
    </div>
  );

  return (
    <Popover
      active={popoverActive}
      activator={activator}
      onClose={closePopover}
      autofocusTarget="none"
      fullWidth
    >
      <div style={{ padding: '12px', borderBottom: '1px solid #dfe3e8' }}>
        <TextField
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
          }}
          placeholder="Search for a category..."
          prefix={<Icon source={SearchMinor} />}
          clearButton
          onClearButtonClick={() => setSearchQuery('')}
          autoComplete="off"
        />
      </div>
      
      {!searchQuery && history.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #dfe3e8', display: 'flex', alignItems: 'center' }}>
          <Button plain icon={ArrowLeftMinor} onClick={handleBack} />
          <div style={{ marginLeft: '8px' }}>
            <Text variant="bodySm" fontWeight="bold">
              {history[history.length - 1].name}
            </Text>
          </div>
        </div>
      )}

      <Scrollable style={{ height: '300px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <Spinner size="small" />
          </div>
        ) : nodes.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text color="subdued">No categories found.</Text>
          </div>
        ) : (
          <ActionList
            items={nodes.map(node => ({
              content: searchQuery ? (node.fullName || node.name) : node.name,
              suffix: !node.isLeaf && !searchQuery ? <Icon source={ChevronRightMinor} /> : null,
              onAction: () => handleSelectNode(node)
            }))}
          />
        )}
      </Scrollable>
    </Popover>
  );
}
