import { useState } from "react";
import { Badge, Button, Card, Layout, Page, Stack, Text, TextField } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

const initialRules = [
  { name: "Flag low inventory", trigger: "Inventory changes", action: "Send notification", enabled: true },
  { name: "Tag new products", trigger: "Product created", action: "Apply tag: new-arrival", enabled: true },
  { name: "Collection cleanup", trigger: "Product updated", action: "Update collection", enabled: false },
];

export default function Automation() {
  const [rules, setRules] = useState(initialRules);
  const [name, setName] = useState("");
  const addRule = () => { if (!name.trim()) return; setRules([...rules, { name, trigger: "Product updated", action: "Send notification", enabled: true }]); setName(""); };
  return <Page fullWidth><TitleBar title="Automation" primaryAction={{ content: "Create rule", onAction: () => {} }} /><Layout><Layout.Section><Stack distribution="equalSpacing" alignment="center"><div><Text as="p" color="subdued">Turn routine catalog maintenance into dependable workflows.</Text></div><Badge status="success">{rules.filter((rule) => rule.enabled).length} active</Badge></Stack><div style={{ margin: "20px 0" }}><Card sectioned><Stack><TextField label="New rule name" labelHidden value={name} onChange={setName} placeholder="Name a new rule" autoComplete="off" /><Button primary onClick={addRule}>Add rule</Button></Stack></Card></div><Card>{rules.map((rule, index) => <Card.Section key={rule.name} subdued={index % 2 === 1}><Stack alignment="center"><Stack.Item fill><Text as="h2" variant="headingMd">{rule.name}</Text><Text as="p" color="subdued">When {rule.trigger.toLowerCase()} then {rule.action.toLowerCase()}</Text></Stack.Item><Button plain onClick={() => setRules(rules.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item))}>{rule.enabled ? "Disable" : "Enable"}</Button><Badge status={rule.enabled ? "success" : "new"}>{rule.enabled ? "Active" : "Paused"}</Badge></Stack></Card.Section>)}</Card></Layout.Section><Layout.Section secondary><Card title="Recent executions" sectioned><Text as="p">18 workflows completed this week</Text><Text as="p" color="subdued">No failed executions.</Text></Card></Layout.Section></Layout></Page>;
}
