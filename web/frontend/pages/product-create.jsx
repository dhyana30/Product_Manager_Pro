import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  DropZone,
  Stack,
  Text,
  Button,
  Checkbox,
  FormLayout,
  ButtonGroup,
  Popover,
  ActionList,
  Icon,
  Modal,
  Tooltip,
} from '@shopify/polaris';
import { CirclePlusMinor, EditMinor , ChevronUpMinor, ChevronDownMinor, SelectMinor, InfoMinor, SearchMinor, HorizontalDotsMinor, DragHandleMinor, TickMinor, DeleteMinor, ExportMinor, ImportMinor, DynamicSourceMinor } from '@shopify/polaris-icons';
import { TitleBar, Toast } from '@shopify/app-bridge-react';
import JoditEditor from 'jodit-react';
import { FileSelectorModal, CategoryPicker } from '../components';
import { useAuthenticatedFetch } from '../hooks';

const allCountries = [
  {
    "label": "Select",
    "value": ""
  },
  {
    "label": "Afghanistan",
    "value": "AF"
  },
  {
    "label": "Åland Islands",
    "value": "AX"
  },
  {
    "label": "Albania",
    "value": "AL"
  },
  {
    "label": "Algeria",
    "value": "DZ"
  },
  {
    "label": "Andorra",
    "value": "AD"
  },
  {
    "label": "Angola",
    "value": "AO"
  },
  {
    "label": "Anguilla",
    "value": "AI"
  },
  {
    "label": "Antigua & Barbuda",
    "value": "AG"
  },
  {
    "label": "Argentina",
    "value": "AR"
  },
  {
    "label": "Armenia",
    "value": "AM"
  },
  {
    "label": "Aruba",
    "value": "AW"
  },
  {
    "label": "Ascension Island",
    "value": "AC"
  },
  {
    "label": "Australia",
    "value": "AU"
  },
  {
    "label": "Austria",
    "value": "AT"
  },
  {
    "label": "Azerbaijan",
    "value": "AZ"
  },
  {
    "label": "Bahamas",
    "value": "BS"
  },
  {
    "label": "Bahrain",
    "value": "BH"
  },
  {
    "label": "Bangladesh",
    "value": "BD"
  },
  {
    "label": "Barbados",
    "value": "BB"
  },
  {
    "label": "Belarus",
    "value": "BY"
  },
  {
    "label": "Belgium",
    "value": "BE"
  },
  {
    "label": "Belize",
    "value": "BZ"
  },
  {
    "label": "Benin",
    "value": "BJ"
  },
  {
    "label": "Bermuda",
    "value": "BM"
  },
  {
    "label": "Bhutan",
    "value": "BT"
  },
  {
    "label": "Bolivia",
    "value": "BO"
  },
  {
    "label": "Bosnia & Herzegovina",
    "value": "BA"
  },
  {
    "label": "Botswana",
    "value": "BW"
  },
  {
    "label": "Brazil",
    "value": "BR"
  },
  {
    "label": "British Indian Ocean Territory",
    "value": "IO"
  },
  {
    "label": "British Virgin Islands",
    "value": "VG"
  },
  {
    "label": "Brunei",
    "value": "BN"
  },
  {
    "label": "Bulgaria",
    "value": "BG"
  },
  {
    "label": "Burkina Faso",
    "value": "BF"
  },
  {
    "label": "Burundi",
    "value": "BI"
  },
  {
    "label": "Cambodia",
    "value": "KH"
  },
  {
    "label": "Cameroon",
    "value": "CM"
  },
  {
    "label": "Canada",
    "value": "CA"
  },
  {
    "label": "Cape Verde",
    "value": "CV"
  },
  {
    "label": "Caribbean Netherlands",
    "value": "BQ"
  },
  {
    "label": "Cayman Islands",
    "value": "KY"
  },
  {
    "label": "Central African Republic",
    "value": "CF"
  },
  {
    "label": "Chad",
    "value": "TD"
  },
  {
    "label": "Chile",
    "value": "CL"
  },
  {
    "label": "China",
    "value": "CN"
  },
  {
    "label": "Christmas Island",
    "value": "CX"
  },
  {
    "label": "Cocos (Keeling) Islands",
    "value": "CC"
  },
  {
    "label": "Colombia",
    "value": "CO"
  },
  {
    "label": "Comoros",
    "value": "KM"
  },
  {
    "label": "Congo - Brazzaville",
    "value": "CG"
  },
  {
    "label": "Congo - Kinshasa",
    "value": "CD"
  },
  {
    "label": "Cook Islands",
    "value": "CK"
  },
  {
    "label": "Costa Rica",
    "value": "CR"
  },
  {
    "label": "Côte d’Ivoire",
    "value": "CI"
  },
  {
    "label": "Croatia",
    "value": "HR"
  },
  {
    "label": "Curaçao",
    "value": "CW"
  },
  {
    "label": "Cyprus",
    "value": "CY"
  },
  {
    "label": "Czechia",
    "value": "CZ"
  },
  {
    "label": "Denmark",
    "value": "DK"
  },
  {
    "label": "Djibouti",
    "value": "DJ"
  },
  {
    "label": "Dominica",
    "value": "DM"
  },
  {
    "label": "Dominican Republic",
    "value": "DO"
  },
  {
    "label": "Ecuador",
    "value": "EC"
  },
  {
    "label": "Egypt",
    "value": "EG"
  },
  {
    "label": "El Salvador",
    "value": "SV"
  },
  {
    "label": "Equatorial Guinea",
    "value": "GQ"
  },
  {
    "label": "Eritrea",
    "value": "ER"
  },
  {
    "label": "Estonia",
    "value": "EE"
  },
  {
    "label": "Eswatini",
    "value": "SZ"
  },
  {
    "label": "Ethiopia",
    "value": "ET"
  },
  {
    "label": "Falkland Islands",
    "value": "FK"
  },
  {
    "label": "Faroe Islands",
    "value": "FO"
  },
  {
    "label": "Fiji",
    "value": "FJ"
  },
  {
    "label": "Finland",
    "value": "FI"
  },
  {
    "label": "France",
    "value": "FR"
  },
  {
    "label": "French Guiana",
    "value": "GF"
  },
  {
    "label": "French Polynesia",
    "value": "PF"
  },
  {
    "label": "French Southern Territories",
    "value": "TF"
  },
  {
    "label": "Gabon",
    "value": "GA"
  },
  {
    "label": "Gambia",
    "value": "GM"
  },
  {
    "label": "Georgia",
    "value": "GE"
  },
  {
    "label": "Germany",
    "value": "DE"
  },
  {
    "label": "Ghana",
    "value": "GH"
  },
  {
    "label": "Gibraltar",
    "value": "GI"
  },
  {
    "label": "Greece",
    "value": "GR"
  },
  {
    "label": "Greenland",
    "value": "GL"
  },
  {
    "label": "Grenada",
    "value": "GD"
  },
  {
    "label": "Guadeloupe",
    "value": "GP"
  },
  {
    "label": "Guatemala",
    "value": "GT"
  },
  {
    "label": "Guernsey",
    "value": "GG"
  },
  {
    "label": "Guinea",
    "value": "GN"
  },
  {
    "label": "Guinea-Bissau",
    "value": "GW"
  },
  {
    "label": "Guyana",
    "value": "GY"
  },
  {
    "label": "Haiti",
    "value": "HT"
  },
  {
    "label": "Honduras",
    "value": "HN"
  },
  {
    "label": "Hong Kong SAR",
    "value": "HK"
  },
  {
    "label": "Hungary",
    "value": "HU"
  },
  {
    "label": "Iceland",
    "value": "IS"
  },
  {
    "label": "India",
    "value": "IN"
  },
  {
    "label": "Indonesia",
    "value": "ID"
  },
  {
    "label": "Iraq",
    "value": "IQ"
  },
  {
    "label": "Ireland",
    "value": "IE"
  },
  {
    "label": "Isle of Man",
    "value": "IM"
  },
  {
    "label": "Israel",
    "value": "IL"
  },
  {
    "label": "Italy",
    "value": "IT"
  },
  {
    "label": "Jamaica",
    "value": "JM"
  },
  {
    "label": "Japan",
    "value": "JP"
  },
  {
    "label": "Jersey",
    "value": "JE"
  },
  {
    "label": "Jordan",
    "value": "JO"
  },
  {
    "label": "Kazakhstan",
    "value": "KZ"
  },
  {
    "label": "Kenya",
    "value": "KE"
  },
  {
    "label": "Kiribati",
    "value": "KI"
  },
  {
    "label": "Kosovo",
    "value": "XK"
  },
  {
    "label": "Kuwait",
    "value": "KW"
  },
  {
    "label": "Kyrgyzstan",
    "value": "KG"
  },
  {
    "label": "Laos",
    "value": "LA"
  },
  {
    "label": "Latvia",
    "value": "LV"
  },
  {
    "label": "Lebanon",
    "value": "LB"
  },
  {
    "label": "Lesotho",
    "value": "LS"
  },
  {
    "label": "Liberia",
    "value": "LR"
  },
  {
    "label": "Libya",
    "value": "LY"
  },
  {
    "label": "Liechtenstein",
    "value": "LI"
  },
  {
    "label": "Lithuania",
    "value": "LT"
  },
  {
    "label": "Luxembourg",
    "value": "LU"
  },
  {
    "label": "Macao SAR",
    "value": "MO"
  },
  {
    "label": "Madagascar",
    "value": "MG"
  },
  {
    "label": "Malawi",
    "value": "MW"
  },
  {
    "label": "Malaysia",
    "value": "MY"
  },
  {
    "label": "Maldives",
    "value": "MV"
  },
  {
    "label": "Mali",
    "value": "ML"
  },
  {
    "label": "Malta",
    "value": "MT"
  },
  {
    "label": "Martinique",
    "value": "MQ"
  },
  {
    "label": "Mauritania",
    "value": "MR"
  },
  {
    "label": "Mauritius",
    "value": "MU"
  },
  {
    "label": "Mayotte",
    "value": "YT"
  },
  {
    "label": "Mexico",
    "value": "MX"
  },
  {
    "label": "Moldova",
    "value": "MD"
  },
  {
    "label": "Monaco",
    "value": "MC"
  },
  {
    "label": "Mongolia",
    "value": "MN"
  },
  {
    "label": "Montenegro",
    "value": "ME"
  },
  {
    "label": "Montserrat",
    "value": "MS"
  },
  {
    "label": "Morocco",
    "value": "MA"
  },
  {
    "label": "Mozambique",
    "value": "MZ"
  },
  {
    "label": "Myanmar (Burma)",
    "value": "MM"
  },
  {
    "label": "Namibia",
    "value": "NA"
  },
  {
    "label": "Nauru",
    "value": "NR"
  },
  {
    "label": "Nepal",
    "value": "NP"
  },
  {
    "label": "Netherlands",
    "value": "NL"
  },
  {
    "label": "New Caledonia",
    "value": "NC"
  },
  {
    "label": "New Zealand",
    "value": "NZ"
  },
  {
    "label": "Nicaragua",
    "value": "NI"
  },
  {
    "label": "Niger",
    "value": "NE"
  },
  {
    "label": "Nigeria",
    "value": "NG"
  },
  {
    "label": "Niue",
    "value": "NU"
  },
  {
    "label": "Norfolk Island",
    "value": "NF"
  },
  {
    "label": "North Macedonia",
    "value": "MK"
  },
  {
    "label": "Norway",
    "value": "NO"
  },
  {
    "label": "Oman",
    "value": "OM"
  },
  {
    "label": "Pakistan",
    "value": "PK"
  },
  {
    "label": "Palestinian Territories",
    "value": "PS"
  },
  {
    "label": "Panama",
    "value": "PA"
  },
  {
    "label": "Papua New Guinea",
    "value": "PG"
  },
  {
    "label": "Paraguay",
    "value": "PY"
  },
  {
    "label": "Peru",
    "value": "PE"
  },
  {
    "label": "Philippines",
    "value": "PH"
  },
  {
    "label": "Pitcairn Islands",
    "value": "PN"
  },
  {
    "label": "Poland",
    "value": "PL"
  },
  {
    "label": "Portugal",
    "value": "PT"
  },
  {
    "label": "Qatar",
    "value": "QA"
  },
  {
    "label": "Réunion",
    "value": "RE"
  },
  {
    "label": "Romania",
    "value": "RO"
  },
  {
    "label": "Rwanda",
    "value": "RW"
  },
  {
    "label": "Samoa",
    "value": "WS"
  },
  {
    "label": "San Marino",
    "value": "SM"
  },
  {
    "label": "São Tomé & Príncipe",
    "value": "ST"
  },
  {
    "label": "Saudi Arabia",
    "value": "SA"
  },
  {
    "label": "Senegal",
    "value": "SN"
  },
  {
    "label": "Serbia",
    "value": "RS"
  },
  {
    "label": "Seychelles",
    "value": "SC"
  },
  {
    "label": "Sierra Leone",
    "value": "SL"
  },
  {
    "label": "Singapore",
    "value": "SG"
  },
  {
    "label": "Sint Maarten",
    "value": "SX"
  },
  {
    "label": "Slovakia",
    "value": "SK"
  },
  {
    "label": "Slovenia",
    "value": "SI"
  },
  {
    "label": "Solomon Islands",
    "value": "SB"
  },
  {
    "label": "Somalia",
    "value": "SO"
  },
  {
    "label": "South Africa",
    "value": "ZA"
  },
  {
    "label": "South Georgia & South Sandwich Islands",
    "value": "GS"
  },
  {
    "label": "South Korea",
    "value": "KR"
  },
  {
    "label": "South Sudan",
    "value": "SS"
  },
  {
    "label": "Spain",
    "value": "ES"
  },
  {
    "label": "Sri Lanka",
    "value": "LK"
  },
  {
    "label": "St. Barthélemy",
    "value": "BL"
  },
  {
    "label": "St. Helena",
    "value": "SH"
  },
  {
    "label": "St. Kitts & Nevis",
    "value": "KN"
  },
  {
    "label": "St. Lucia",
    "value": "LC"
  },
  {
    "label": "St. Martin",
    "value": "MF"
  },
  {
    "label": "St. Pierre & Miquelon",
    "value": "PM"
  },
  {
    "label": "St. Vincent & Grenadines",
    "value": "VC"
  },
  {
    "label": "Sudan",
    "value": "SD"
  },
  {
    "label": "Suriname",
    "value": "SR"
  },
  {
    "label": "Svalbard & Jan Mayen",
    "value": "SJ"
  },
  {
    "label": "Sweden",
    "value": "SE"
  },
  {
    "label": "Switzerland",
    "value": "CH"
  },
  {
    "label": "Taiwan",
    "value": "TW"
  },
  {
    "label": "Tajikistan",
    "value": "TJ"
  },
  {
    "label": "Tanzania",
    "value": "TZ"
  },
  {
    "label": "Thailand",
    "value": "TH"
  },
  {
    "label": "Timor-Leste",
    "value": "TL"
  },
  {
    "label": "Togo",
    "value": "TG"
  },
  {
    "label": "Tokelau",
    "value": "TK"
  },
  {
    "label": "Tonga",
    "value": "TO"
  },
  {
    "label": "Trinidad & Tobago",
    "value": "TT"
  },
  {
    "label": "Tristan da Cunha",
    "value": "TA"
  },
  {
    "label": "Tunisia",
    "value": "TN"
  },
  {
    "label": "Turkey",
    "value": "TR"
  },
  {
    "label": "Turkmenistan",
    "value": "TM"
  },
  {
    "label": "Turks & Caicos Islands",
    "value": "TC"
  },
  {
    "label": "Tuvalu",
    "value": "TV"
  },
  {
    "label": "U.S. Outlying Islands",
    "value": "UM"
  },
  {
    "label": "Uganda",
    "value": "UG"
  },
  {
    "label": "Ukraine",
    "value": "UA"
  },
  {
    "label": "United Arab Emirates",
    "value": "AE"
  },
  {
    "label": "United Kingdom",
    "value": "GB"
  },
  {
    "label": "United States",
    "value": "US"
  },
  {
    "label": "Uruguay",
    "value": "UY"
  },
  {
    "label": "Uzbekistan",
    "value": "UZ"
  },
  {
    "label": "Vanuatu",
    "value": "VU"
  },
  {
    "label": "Vatican City",
    "value": "VA"
  },
  {
    "label": "Venezuela",
    "value": "VE"
  },
  {
    "label": "Vietnam",
    "value": "VN"
  },
  {
    "label": "Wallis & Futuna",
    "value": "WF"
  },
  {
    "label": "Western Sahara",
    "value": "EH"
  },
  {
    "label": "Yemen",
    "value": "YE"
  },
  {
    "label": "Zambia",
    "value": "ZM"
  },
  {
    "label": "Zimbabwe",
    "value": "ZW"
  }
];

export default function ProductCreate() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();

  const [orgOptions, setOrgOptions] = useState({ types: [], vendors: [], tags: [], collections: [] });

  useEffect(() => {
    fetch('/api/product-organization-options')
      .then(res => res.json())
      .then(data => setOrgOptions({
          types: data.types || [],
          vendors: data.vendors || [],
          tags: data.tags || [],
          collections: data.collections || []
      }))
      .catch(err => console.error("Failed to load options", err));
  }, []);


  const [inventoryTracked, setInventoryTracked] = useState(true);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [sku, setSku] = useState('');
  const [hsMenuOpen, setHsMenuOpen] = useState(false);
  const [hsModalOpen, setHsModalOpen] = useState(false);
  const [hsCountryCodes, setHsCountryCodes] = useState([{ country: '', code: '' }]);

  const addHsCountryCode = () => {
    setHsCountryCodes([...hsCountryCodes, { country: '', code: '' }]);
  };
  const removeHsCountryCode = (index) => {
    const newCodes = [...hsCountryCodes];
    newCodes.splice(index, 1);
    setHsCountryCodes(newCodes);
  };
  const updateHsCountry = (index, val) => {
    const newCodes = [...hsCountryCodes];
    newCodes[index].country = val;
    setHsCountryCodes(newCodes);
  };
  const updateHsCode = (index, val) => {
    const newCodes = [...hsCountryCodes];
    newCodes[index].code = val;
    setHsCountryCodes(newCodes);
  };
  const [barcodesList, setBarcodesList] = useState([{ value: '', type: 'Custom' }]);
  const [barcodePopoverActive, setBarcodePopoverActive] = useState(false);
  const [activeBarcodeTypeIndex, setActiveBarcodeTypeIndex] = useState(null);

  const updateBarcodeValue = (index, val) => {
    const newList = [...barcodesList];
    newList[index].value = val;
    setBarcodesList(newList);
  };

  const updateBarcodeType = (index, type) => {
    const newList = [...barcodesList];
    newList[index].type = type;
    setBarcodesList(newList);
    setActiveBarcodeTypeIndex(null);
  };

  const removeBarcode = (index) => {
    const newList = [...barcodesList];
    newList.splice(index, 1);
    setBarcodesList(newList);
  };

  const addBarcode = () => {
    setBarcodesList([...barcodesList, { value: '', type: 'Custom' }]);
  };

  const clearAllBarcodes = () => {
    setBarcodesList([{ value: '', type: 'Custom' }]);
  };
  const [sellOutOfStock, setSellOutOfStock] = useState(false);
  const [locationsModalOpen, setLocationsModalOpen] = useState(false);
  const [locations, setLocations] = useState([
    { id: '1', name: 'depot 1', quantity: 0, checked: true },
    { id: '2', name: 'depot 2', quantity: 0, checked: true },
    { id: '3', name: 'depot 3', quantity: 0, checked: true },
    { id: '4', name: 'My Custom Location', quantity: 0, checked: true },
    { id: '5', name: 'Shop', quantity: 0, checked: true },
    { id: '6', name: 'Shop location', quantity: 0, checked: true },
    { id: '7', name: 'Snow City Warehouse', app: 'App', subtitle: 'Add a SKU to use this location.', quantity: 0, checked: false, disabled: true }
  ]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const descriptionRef = useRef(description);
  const [storeMediaModalOpen, setStoreMediaModalOpen] = useState(false);
  const [mediaOrder, setMediaOrder] = useState([]);
  
  // Pricing states
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [costPerItem, setCostPerItem] = useState('');
  const [showCost, setShowCost] = useState(false);
  const [taxable, setTaxable] = useState(true);
  const [showUnitPrice, setShowUnitPrice] = useState(false);
  const [unitPriceActive, setUnitPriceActive] = useState(false);
  const [unitTotalAmount, setUnitTotalAmount] = useState('');
  const [unitBaseMeasure, setUnitBaseMeasure] = useState('1');
  const [unitBaseUnit, setUnitBaseUnit] = useState('KG');
  const [currency, setCurrency] = useState('USD');
  const [pricingExpanded, setPricingExpanded] = useState(false);

  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch('/api/shop-settings');
        if (res.ok) {
          const data = await res.json();
          setCurrency(data.currencyCode || 'USD');
        }
      } catch (e) {}
    }
    fetchShop();
  }, [fetch]);

  const handleStoreMediaSelect = (files) => {
     // placeholder for media logic
     setStoreMediaModalOpen(false);
  };

  const [vendor, setVendor] = useState('None');
  const [productType, setProductType] = useState('None');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('Active');
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [collectionsPopoverOpen, setCollectionsPopoverOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('Default product');
  const [tagSearch, setTagSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [typeSearch, setTypeSearch] = useState('');
  const [publishingModalOpen, setPublishingModalOpen] = useState(false);
  const [publishingActiveTab, setPublishingActiveTab] = useState('Sales Channels');
  const [price, setPrice] = useState('0.00');

  const [weight, setWeight] = useState('0.0');
  const [shippingPhysical, setShippingPhysical] = useState(true);
  const [shippingExpanded, setShippingExpanded] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [country, setCountry] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [variantOptions, setVariantOptions] = useState([]);
  const [variantPopoverActive, setVariantPopoverActive] = useState(false);
  const [activeMetafieldPopoverIndex, setActiveMetafieldPopoverIndex] = useState(null);

  const [purchaseOptions, setPurchaseOptions] = useState([]);
  const [purchaseOptionsPopoverActive, setPurchaseOptionsPopoverActive] = useState(false);
  const [onlySellWithTheseOptions, setOnlySellWithTheseOptions] = useState(false);
  const [disclosuresActive, setDisclosuresActive] = useState(false);
  const [addMetafieldModalOpen, setAddMetafieldModalOpen] = useState(false);
  const [apiAccess, setApiAccess] = useState(false);
  const [metafieldValueType, setMetafieldValueType] = useState('one');
  const [metafieldTypeValuePopoverOpen, setMetafieldTypeValuePopoverOpen] = useState(false);
  const [metafieldTypeSelectPopoverOpen, setMetafieldTypeSelectPopoverOpen] = useState(false);
  const [metafieldSelectedType, setMetafieldSelectedType] = useState('');
  const [activeDrilldown, setActiveDrilldown] = useState(null);
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoUrl, setSeoUrl] = useState('products/');

  const availablePurchaseOptions = [
    { title: 'Preorder', desc: 'Preorder ski wax, delivered in a month' },
    { title: 'Try Before You Buy', desc: 'Try our product risk-free for a week before needing to pay' },
    { title: 'Prepaid', desc: 'Pay upfront for future deliveries' },
    { title: 'Subscription', desc: 'Subscribe and get this delivered regularly' }
  ];

  const addPurchaseOption = (title, desc) => {
    setPurchaseOptions([...purchaseOptions, { title, desc }]);
    setPurchaseOptionsPopoverActive(false);
  };

  const PurchaseIcon = () => (
    <div style={{ color: '#00a0ac', display: 'flex', alignItems: 'center' }}>
      <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M10 2c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 7.352 18 6.262 18 5c0-1.657-3.582-3-8-3Zm0 5c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 12.352 18 11.262 18 10c0-1.657-3.582-3-8-3v1.889c0 1.657-3.582 3-8 3s-8-1.343-8-3V7Zm0 5c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 17.352 18 16.262 18 15c0-1.657-3.582-3-8-3v1.889c0 1.657-3.582 3-8 3s-8-1.343-8-3v-1.889Z"/></svg>
    </div>
  );

  const addVariantOption = (name) => {
    setVariantOptions([...variantOptions, { name, values: '' }]);
    setVariantPopoverActive(false);
  };
  const updateVariantOptionName = (index, val) => {
    const newOpts = [...variantOptions];
    newOpts[index].name = val;
    setVariantOptions(newOpts);
  };
  const updateVariantOptionValue = (index, val) => {
    const newOpts = [...variantOptions];
    newOpts[index].values = val;
    setVariantOptions(newOpts);
  };
  const removeVariantOption = (index) => {
    const newOpts = [...variantOptions];
    newOpts.splice(index, 1);
    setVariantOptions(newOpts);
  };
  const [isSaving, setIsSaving] = useState(false);
  const [toastProps, setToastProps] = useState({ content: null });
  const toastMarkup = toastProps.content ? (
    <Toast {...toastProps} onDismiss={() => setToastProps({ content: null })} />
  ) : null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: descriptionRef.current,
          vendor,
          productType,
          category,
          status,
          price,
          sku,
          weight,
          compareAtPrice,
          costPerItem,
          taxable,
          unitPriceMeasurement: (showUnitPrice && unitTotalAmount && unitBaseMeasure) ? {
            measuredType: 'WEIGHT',
            quantityValue: unitTotalAmount,
            quantityUnit: unitBaseUnit,
            referenceValue: unitBaseMeasure,
            referenceUnit: unitBaseUnit
          } : null,
          mediaOrder,
          tags: selectedTags.join(','),
          seoTitle,
          seoDescription,
          urlHandle: seoUrl,
          barcode: barcodesList[0]?.value || '',
          countryOfOrigin: country,
          hsCode: hsCode || (hsCountryCodes[0] && hsCountryCodes[0].code) || '',
          inventoryTracked,
          continueSelling: sellOutOfStock,
          quantities: locations.reduce((acc, loc) => {
              if (loc.checked) acc[loc.id] = loc.quantity;
              return acc;
          }, {})
        }),
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch(e) {}
      
      if (!response.ok) {
        let errorMsg = 'Failed to create product';
        if (responseData && responseData.message) {
            errorMsg = responseData.message;
            if (responseData.errors && responseData.errors.length > 0 && responseData.errors[0].message) {
                errorMsg = responseData.errors[0].message;
            }
        }
        throw new Error(errorMsg);
      }

      setToastProps({ content: 'Product created successfully' });
      setTimeout(() => navigate('/catalog'), 1000);
    } catch (error) {
      console.error(error);
      setToastProps({ content: error.message || 'Failed to create product', error: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Page
      backAction={{ content: 'Products', onAction: () => navigate('/catalog') }}
      title="Add product"
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
        loading: isSaving,
      }}
      secondaryActions={[
        {
          content: 'Discard',
          onAction: () => {
             setToastProps({ content: 'Product discarded' });
             setTimeout(() => navigate('/catalog'), 500);
          },
        },
      ]}
    >
      {toastMarkup}
      <Layout>
        <Layout.Section>
          <Stack vertical spacing="loose">
            <Card sectioned>
              <FormLayout>
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Short sleeve t-shirt"
                  autoComplete="off"
                />
                <div>
                  <Text as="p" variant="bodyMd" style={{marginBottom: '4px'}}>Description</Text>
                  <div className="shopify-style-editor" style={{ border: '1px solid #dfe3e8', borderRadius: '4px', overflow: 'hidden' }}>
                    <JoditEditor
                      value={description}
                      config={{
                        buttons: ['paragraph', 'bold', 'italic', 'underline', 'font', 'align', 'link', 'image', 'video', 'table', 'dots', 'source'],
                        removeButtons: ['brush', 'file', 'copyformat', 'undo', 'redo', 'fullsize', 'hr', 'eraser', 'symbol', 'superscript', 'subscript'],
                        showCharsCounter: false,
                        showWordsCounter: false,
                        showXPathInStatusbar: false,
                        toolbarAdaptive: false,
                        hidePoweredByJodit: true,
                        statusbar: false,
                        height: 300
                      }}
                      onChange={(newContent) => {
                         descriptionRef.current = newContent;
                      }}
                    />
                  </div>
                </div>
              </FormLayout>
            </Card>

            <Card title="Media" sectioned>
              <DropZone onDrop={() => {}}>
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text variant="bodyMd" as="p" color="subdued">Accepts images, videos, or 3D models</Text>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                    <Button onClick={(e) => e.stopPropagation()}>Add images</Button>
                    <Button onClick={(e) => { e.stopPropagation(); setStoreMediaModalOpen(true); }}>Select existing</Button>
                  </div>
                </div>
              </DropZone>
            </Card>

            <Card title="Category" sectioned>
              <div>
                <CategoryPicker selectedCategory={category} onSelect={setCategory} />
                <Text variant="bodySm" color="subdued" as="p" style={{ marginTop: '4px' }}>
                  Determines tax rates and adds metafields to improve search, filters, and cross-channel sales.
                </Text>
              </div>
            </Card>

            <Card>
              <Card.Section>
                <div style={{ maxWidth: '240px' }}>
                  <TextField label="Price" type="number" value={price} onChange={setPrice} prefix={currency} autoComplete="off" />
                </div>
              </Card.Section>
              
              {!pricingExpanded && (
                <div 
                  style={{ padding: '16px 20px', borderTop: '1px solid #dfe3e8', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                  onClick={() => setPricingExpanded(true)}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #c9cccf', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#202223' }}>Compare-at</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #c9cccf', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#202223' }}>Unit price</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #c9cccf', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#202223' }}>
                      Charge tax <span style={{ marginLeft: '8px', backgroundColor: '#005e4d', color: '#fff', padding: '1px 8px', borderRadius: '12px', fontSize: '12px' }}>Yes</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #c9cccf', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#202223' }}>Cost per item</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #c9cccf', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', color: '#202223', gap: '4px' }}>More <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor"><path d="M10 14a.997.997 0 0 1-.707-.293l-5-5a.999.999 0 1 1 1.414-1.414L10 11.586l4.293-4.293a.999.999 0 1 1 1.414 1.414l-5 5A.997.997 0 0 1 10 14z"/></svg></div>
                  </div>
                </div>
              )}
              
              {pricingExpanded && (
                <Card.Section>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '16px' }}
                    onClick={() => setPricingExpanded(false)}
                  >
                    <Text variant="headingSm" as="h6">Additional display prices</Text>
                    <Icon source={ChevronUpMinor} color="subdued" />
                  </div>
                  
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField label="Compare-at price" type="number" value={compareAtPrice} onChange={setCompareAtPrice} prefix={currency} autoComplete="off" />
                      
                      <div>
                        <div style={{ marginBottom: '4px' }}>
                          <Text as="p" variant="bodyMd">Unit price</Text>
                        </div>
                        <Popover
                          active={unitPriceActive}
                          activator={
                            <div 
                              onClick={() => setUnitPriceActive(true)}
                              style={{ border: '1px solid #c9cccf', borderRadius: '4px', padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: '36px', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(0,0,0,0.05)' }}
                            >
                              <Text as="span" color="subdued">{showUnitPrice ? 'Configured' : '--'}</Text>
                              <Icon source={SelectMinor} color="subdued" />
                            </div>
                          }
                          onClose={() => setUnitPriceActive(false)}
                          autofocusTarget="none"
                        >
                          <div style={{ padding: '16px', minWidth: '320px' }}>
                            <FormLayout>
                              <TextField 
                                label="Total amount" 
                                type="number" 
                                value={unitTotalAmount} 
                                onChange={setUnitTotalAmount} 
                                autoComplete="off"
                                connectedRight={
                                  <Select
                                    labelHidden
                                    label="Unit"
                                    options={['g', 'kg', 'ml', 'L', 'm', 'cm']}
                                    value={unitBaseUnit}
                                    onChange={setUnitBaseUnit}
                                  />
                                }
                              />
                              <TextField 
                                label="Base measure" 
                                type="number" 
                                value={unitBaseMeasure} 
                                onChange={setUnitBaseMeasure} 
                                autoComplete="off"
                                connectedRight={
                                  <Select
                                    labelHidden
                                    label="Unit"
                                    options={['g', 'kg', 'ml', 'L', 'm', 'cm']}
                                    value={unitBaseUnit}
                                    onChange={setUnitBaseUnit}
                                  />
                                }
                              />
                            </FormLayout>
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Button plain destructive onClick={() => { setShowUnitPrice(false); setUnitPriceActive(false); }}>Clear</Button>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Button onClick={() => setUnitPriceActive(false)}>Cancel</Button>
                                <Button primary onClick={() => { setShowUnitPrice(true); setUnitPriceActive(false); }}>Done</Button>
                              </div>
                            </div>
                          </div>
                        </Popover>
                      </div>
                    </FormLayout.Group>
                    
                    <div style={{ marginTop: '4px' }}>
                      <Checkbox label="Charge tax on this product" checked={taxable} onChange={setTaxable} />
                    </div>
                  </FormLayout>
                </Card.Section>
              )}

              {pricingExpanded && (
                <Card.Section>
                  {!showCost ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div 
                        onClick={() => setShowCost(true)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', border: '1px solid #c9cccf', padding: '4px 8px', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }}
                      >
                        Cost <span style={{ marginLeft: '8px', backgroundColor: '#f4f6f8', padding: '2px 8px', borderRadius: '4px', color: '#5c5f62' }}>{costPerItem || '--'}</span>
                      </div>
                      <div 
                        onClick={() => setShowCost(true)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', border: '1px solid #c9cccf', padding: '4px 8px', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }}
                      >
                        Profit <span style={{ marginLeft: '8px', backgroundColor: '#f4f6f8', padding: '2px 8px', borderRadius: '4px', color: '#5c5f62' }}>{price && costPerItem ? (parseFloat(price) - parseFloat(costPerItem)).toFixed(2) : '--'}</span>
                      </div>
                      <div 
                        onClick={() => setShowCost(true)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', border: '1px solid #c9cccf', padding: '4px 8px', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }}
                      >
                        Margin <span style={{ marginLeft: '8px', backgroundColor: '#f4f6f8', padding: '2px 8px', borderRadius: '4px', color: '#5c5f62' }}>{price && costPerItem && parseFloat(price) > 0 ? ((parseFloat(price) - parseFloat(costPerItem)) / parseFloat(price) * 100).toFixed(1) + '%' : '--'}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <TextField label="Cost per item" type="number" value={costPerItem} onChange={setCostPerItem} prefix={currency} autoComplete="off" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text as="p" variant="bodyMd">Profit</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Text as="p">{price && costPerItem ? (parseFloat(price) - parseFloat(costPerItem)).toFixed(2) : '--'}</Text>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text as="p" variant="bodyMd">Margin</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Text as="p">{price && costPerItem && parseFloat(price) > 0 ? ((parseFloat(price) - parseFloat(costPerItem)) / parseFloat(price) * 100).toFixed(1) + '%' : '--'}</Text>
                        </div>
                      </div>
                    </div>
                  )}
                </Card.Section>
              )}
            </Card>

            <Card>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="headingSm" as="h3">Inventory</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text as="p" color="subdued">Inventory tracked</Text>
                  <div 
                    onClick={() => setInventoryTracked(!inventoryTracked)}
                    style={{ 
                      width: '36px', height: '20px', backgroundColor: inventoryTracked ? '#005e4d' : '#dfe3e8', 
                      borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' 
                    }}
                  >
                    <div style={{
                      width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%',
                      position: 'absolute', top: '2px', left: inventoryTracked ? '18px' : '2px', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ margin: '0 20px', border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #dfe3e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text as="span" color="subdued" fontWeight="bold" variant="bodySm">LOCATION</Text>
                  <Text as="span" color="subdued" fontWeight="bold" variant="bodySm">QUANTITY</Text>
                </div>
                
                {locations.filter(l => l.checked).map((loc, i, arr) => (
                  <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i === arr.length - 1 ? 'none' : '1px solid #dfe3e8' }}>
                    <Text as="span">{loc.name}</Text>
                    <div style={{ width: '100px' }}>
                      <TextField 
                        type="number" 
                        value={loc.quantity.toString()} 
                        onChange={(v) => {
                          const newLocs = [...locations];
                          const idx = newLocs.findIndex(l => l.id === loc.id);
                          newLocs[idx].quantity = parseInt(v) || 0;
                          setLocations(newLocs);
                        }}
                        autoComplete="off" 
                      />
                    </div>
                  </div>
                ))}
              </div>

              {!inventoryExpanded ? (
                <div 
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }} 
                  onClick={() => setInventoryExpanded(true)}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>SKU</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>Barcodes</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>
                      Sell when out of stock <span style={{ marginLeft: '8px', backgroundColor: '#d1d3d4', padding: '1px 8px', borderRadius: '12px', fontSize: '12px' }}>{sellOutOfStock ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                  <Icon source={ChevronDownMinor} color="subdued" />
                </div>
              ) : (
                <div style={{ padding: '16px 20px', borderTop: '1px solid #dfe3e8', marginTop: '16px' }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '16px' }}
                    onClick={() => setInventoryExpanded(false)}
                  >
                    <Text variant="headingSm" as="h6">More details</Text>
                    <Icon source={ChevronUpMinor} color="subdued" />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <TextField label="SKU (Stock Keeping Unit)" value={sku} onChange={setSku} autoComplete="off" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '4px' }}>
                        <Text as="span" variant="bodyMd">Barcodes</Text>
                      </div>
<Popover
                        active={barcodePopoverActive}
                        activator={
                          <div 
                            onClick={() => setBarcodePopoverActive(true)}
                            style={{ 
                              border: '1px solid #c9cccf', 
                              borderRadius: '4px', 
                              padding: '0 12px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              backgroundColor: '#fff', 
                              cursor: 'pointer',
                              boxShadow: 'inset 0 1px 0 0 rgba(0,0,0,0.05)',
                              height: '36px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <span style={{ color: barcodesList[0].value || barcodesList.length > 1 ? '#202223' : '#8c9196', fontSize: '14px' }}>
                              {barcodesList.length > 1 ? `${barcodesList.length} barcodes` : (barcodesList[0].value || 'ISBN, UPC, GTIN, etc.')}
                            </span>
                            <Icon source={ChevronDownMinor} color="subdued" />
                          </div>
                        }
                        onClose={() => setBarcodePopoverActive(false)}
                        autofocusTarget="none"
                      >
                        <div style={{ padding: '16px', width: '380px' }} onClick={(e) => e.stopPropagation()}>
                          {barcodesList.map((bc, index) => (
                            <div key={index} style={{ marginBottom: index < barcodesList.length - 1 ? '12px' : '0' }}>
                              <TextField
                                labelHidden
                                label="Barcode"
                                placeholder="Barcode"
                                value={bc.value}
                                onChange={(val) => updateBarcodeValue(index, val)}
                                autoComplete="off"
                                prefix={
                                  <div style={{ color: '#5c5f62', display: 'flex', alignItems: 'center' }}>
                                    <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                                      <path d="M4 7V4h3v1H5v2H4zm9-3h3v3h-1V5h-2V4zM4 13v3h3v-1H5v-2H4zm12 0v3h-3v-1h2v-2h1zM7 6h1v8H7V6zm2.5 0h1v8h-1V6zm2.5 0h1v8h-1V6z"/>
                                    </svg>
                                  </div>
                                }
                                suffix={
                                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: '8px', borderLeft: '1px solid #c9cccf', marginLeft: '4px' }}>
                                    <Popover
                                      active={activeBarcodeTypeIndex === index}
                                      activator={
                                        <div 
                                          onClick={() => setActiveBarcodeTypeIndex(activeBarcodeTypeIndex === index ? null : index)}
                                          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', paddingRight: barcodesList.length > 1 ? '8px' : '0' }}
                                        >
                                          <span style={{ fontSize: '14px', color: '#202223', marginRight: '4px' }}>{bc.type}</span>
                                          <div style={{ width: '16px', height: '16px', fill: '#5c5f62', display: 'flex', alignItems: 'center' }}>
                                            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                                              <path d="M10 14a.997.997 0 0 1-.707-.293l-4-4a1 1 0 0 1 1.414-1.414L10 11.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4A.997.997 0 0 1 10 14z" />
                                              <path d="M10 6a.997.997 0 0 1 .707.293l4 4a1 1 0 0 1-1.414 1.414L10 8.414l-3.293 3.293a1 1 0 1 1-1.414-1.414l4-4A.997.997 0 0 1 10 6z" />
                                            </svg>
                                          </div>
                                        </div>
                                      }
                                      onClose={() => setActiveBarcodeTypeIndex(null)}
                                      preferredAlignment="right"
                                    >
                                      <ActionList
                                        actionRole="menuitem"
                                        items={[
                                          { content: 'Custom', onAction: () => updateBarcodeType(index, 'Custom'), icon: bc.type === 'Custom' ? TickMinor : undefined },
                                          { content: 'GTIN', onAction: () => updateBarcodeType(index, 'GTIN'), icon: bc.type === 'GTIN' ? TickMinor : undefined },
                                          { content: 'UPC', onAction: () => updateBarcodeType(index, 'UPC'), icon: bc.type === 'UPC' ? TickMinor : undefined },
                                          { content: 'EAN', onAction: () => updateBarcodeType(index, 'EAN'), icon: bc.type === 'EAN' ? TickMinor : undefined },
                                          { content: 'ISBN', onAction: () => updateBarcodeType(index, 'ISBN'), icon: bc.type === 'ISBN' ? TickMinor : undefined },
                                          { content: 'ASIN', onAction: () => updateBarcodeType(index, 'ASIN'), icon: bc.type === 'ASIN' ? TickMinor : undefined },
                                        ]}
                                      />
                                    </Popover>

                                    {barcodesList.length > 1 && (
                                      <div 
                                        onClick={() => removeBarcode(index)}
                                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', paddingLeft: '8px', borderLeft: '1px solid #c9cccf', height: '100%' }}
                                      >
                                        <Icon source={DeleteMinor} color="subdued" />
                                      </div>
                                    )}
                                  </div>
                                }
                              />
                            </div>
                          ))}
                          
                          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div onClick={addBarcode}>
                              <Button plain icon={CirclePlusMinor}>Add barcode</Button>
                            </div>
                            {barcodesList.length > 1 && (
                              <div onClick={clearAllBarcodes}>
                                <Button plain destructive>Clear all</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popover>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Checkbox label="Continue selling when out of stock" checked={sellOutOfStock} onChange={setSellOutOfStock} />
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f4f6f8', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#5c5f62', border: '1px solid #dfe3e8' }}>
                      <Icon source={InfoMinor} color="subdued" /> POS excluded
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="headingSm" as="h3">Shipping</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text as="p" color="subdued">Physical product</Text>
                  <div 
                    onClick={() => setShippingPhysical(!shippingPhysical)}
                    style={{ 
                      width: '36px', height: '20px', backgroundColor: shippingPhysical ? '#2c6ecb' : '#dfe3e8', 
                      borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' 
                    }}
                  >
                    <div style={{
                      width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%',
                      position: 'absolute', top: '2px', left: shippingPhysical ? '18px' : '2px', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 20px 16px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px', color: '#202223' }}>Package</span>
                      <Icon source={InfoMinor} color="subdued" />
                    </div>
                    <div style={{ border: '1px solid #c9cccf', borderRadius: '4px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(0,0,0,0.05)', cursor: 'pointer', boxSizing: 'border-box', width: '100%' }}>
                      <div style={{ flexShrink: 0, marginRight: '8px', display: 'flex' }}>
                        <svg viewBox="0 0 20 20" style={{ width: '18px', height: '18px', fill: '#5c5f62' }}>
                          <path fillRule="evenodd" d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Zm2 3v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7H5Zm6 2v4a1 1 0 0 1-2 0V9a1 1 0 0 1 2 0Z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px', color: '#202223' }}>
                        <span style={{fontWeight: 500}}>Store default</span> • Sample box - 22 x 13.7 x 4.2 cm, 0 kg
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: '8px', display: 'flex' }}>
                        <Icon source={SelectMinor} color="subdued" />
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextField
                      label="Product weight"
                      type="number"
                      value={weight}
                      onChange={setWeight}
                      autoComplete="off"
                      connectedRight={
                        <Select
                          labelHidden
                          label="Unit"
                          options={['g', 'kg', 'lb', 'oz']}
                          value={weightUnit}
                          onChange={setWeightUnit}
                        />
                      }
                    />
                  </div>
                </div>
              </div>

              {!shippingExpanded ? (
                <div 
                  style={{ padding: '16px 20px', borderTop: '1px solid #dfe3e8', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box' }} 
                  onClick={() => setShippingExpanded(true)}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>Country of origin</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>HS Code</div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <Icon source={ChevronDownMinor} color="subdued" />
                </div>
              ) : (
                <div style={{ padding: '16px 20px', borderTop: '1px solid #dfe3e8', width: '100%', boxSizing: 'border-box' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '16px', width: '100%' }}
                    onClick={() => setShippingExpanded(false)}
                  >
                    <Text variant="headingSm" as="h6">More details</Text>
                    <div style={{ flex: 1 }} />
                    <Icon source={ChevronUpMinor} color="subdued" />
                  </div>
                  
                  <div style={{ marginBottom: '16px', width: '100%' }}>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                      <span style={{ fontSize: '14px', color: '#202223' }}>Country/Region of origin</span>
                      <Icon source={InfoMinor} color="subdued" />
                    </div>
                    <Select
                      labelHidden
                      label="Country of origin"
                      options={[{label: 'Select', value: ''}, {label: 'United States', value: 'US'}, {label: 'Canada', value: 'CA'}]}
                      value={country}
                      onChange={setCountry}
                    />
                  </div>
                  
                  <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '14px', color: '#202223' }}>Harmonized System (HS) code</span>
                      <div style={{ marginLeft: '4px' }}>
                        <Icon source={InfoMinor} color="subdued" />
                      </div>
                      <div style={{ flex: 1 }} />
                      <Popover
                        active={hsMenuOpen}
                        activator={
                          <div 
                            onClick={() => setHsMenuOpen(!hsMenuOpen)}
                            style={{ 
                              cursor: 'pointer', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              padding: '4px', 
                              borderRadius: '4px', 
                              backgroundColor: hsMenuOpen ? '#edeeef' : '#f4f6f8',
                              border: '1px solid #dfe3e8',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <Icon source={HorizontalDotsMinor} color="subdued" />
                          </div>
                        }
                        onClose={() => setHsMenuOpen(false)}
                      >
                        <ActionList
                          actionRole="menuitem"
                          items={[
                            {
                              content: 'Add HS codes by country/region',
                              icon: CirclePlusMinor,
                              onAction: () => {
                                setHsMenuOpen(false);
                                setHsModalOpen(true);
                              },
                            },
                            {
                              content: 'Export with CSV',
                              icon: ExportMinor,
                              onAction: () => setHsMenuOpen(false),
                            },
                            {
                              content: 'Import with CSV',
                              icon: ImportMinor,
                              onAction: () => setHsMenuOpen(false),
                            },
                          ]}
                        />
                      </Popover>
                    </div>
                    <TextField
                      labelHidden
                      label="HS Code"
                      placeholder="Enter a 6-digit code or search by keyword"
                      value={hsCode}
                      onChange={setHsCode}
                      autoComplete="off"

                    />
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <div style={{ padding: '16px 20px' }}>
                <Text variant="headingSm" as="h3">Variants</Text>
                
                <div style={{ marginTop: '16px' }}>
                  {variantOptions.length === 0 ? (
                    <Popover
                      active={variantPopoverActive}
                      activator={
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setVariantPopoverActive(true)}>
                          <Icon source={CirclePlusMinor} color="base" />
                          <span style={{ fontSize: '14px', color: '#202223' }}>Add options like size or color</span>
                        </div>
                      }
                      onClose={() => setVariantPopoverActive(false)}
                      autofocusTarget="none"
                    >
                      <div style={{ width: '280px' }}>
                        <div style={{ padding: '12px' }}>
                          <TextField
                            prefix={<Icon source={SearchMinor} color="subdued" />}
                            placeholder="Search"
                            autoComplete="off"
                          />
                          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                            <Text as="p" color="subdued" variant="bodySm">Recommended</Text>
                          </div>
                          <div 
                            style={{ padding: '6px 12px', margin: '0 -4px', cursor: 'pointer' }}
                            onClick={() => addVariantOption('Selection')}
                          >
                            <span style={{ fontSize: '14px', color: '#202223' }}>Selection</span>
                          </div>
                          <div 
                            onClick={() => addVariantOption('Specification')}
                            style={{ padding: '6px 12px', margin: '0 -4px', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '14px', color: '#202223' }}>Specification</span>
                          </div>
                        </div>
                        <div 
                          onClick={() => addVariantOption('')}
                          style={{ borderTop: '1px solid #dfe3e8', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Icon source={CirclePlusMinor} color="subdued" />
                          <span style={{ fontSize: '14px', color: '#202223' }}>Create custom option</span>
                        </div>
                      </div>
                    </Popover>
                  ) : (
                    <div style={{ border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                      {variantOptions.map((opt, index) => (
                        <div key={index} style={{ display: 'flex', padding: '16px', borderBottom: '1px solid #dfe3e8' }}>
                          <div style={{ paddingRight: '12px', paddingTop: '32px', cursor: 'grab' }}>
                            <Icon source={DragHandleMinor} color="subdued" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px', color: '#202223' }}>Option name</span>
                              <Popover
                                active={activeMetafieldPopoverIndex === index}
                                activator={
                                  <div 
                                    onClick={() => setActiveMetafieldPopoverIndex(activeMetafieldPopoverIndex === index ? null : index)}
                                    style={{ backgroundColor: '#e4f0fa', borderRadius: '4px', padding: '4px', display: 'flex', cursor: 'pointer' }}
                                  >
                                    <svg viewBox="0 0 20 20" width="16" height="16" fill="#006fbb"><path d="M10 2c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 7.352 18 6.262 18 5c0-1.657-3.582-3-8-3Zm0 5c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 12.352 18 11.262 18 10c0-1.657-3.582-3-8-3v1.889c0 1.657-3.582 3-8 3s-8-1.343-8-3V7Zm0 5c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 17.352 18 16.262 18 15c0-1.657-3.582-3-8-3v1.889c0 1.657-3.582 3-8 3s-8-1.343-8-3v-1.889Z"/></svg>
                                  </div>
                                }
                                onClose={() => setActiveMetafieldPopoverIndex(null)}
                              >
                                <ActionList
                                  actionRole="menuitem"
                                  items={[
                                    {
                                      content: 'View metafield',
                                      icon: DynamicSourceMinor,
                                      onAction: () => setActiveMetafieldPopoverIndex(null),
                                    },
                                    {
                                      content: 'Disconnect',
                                      icon: DeleteMinor,
                                      destructive: true,
                                      onAction: () => setActiveMetafieldPopoverIndex(null),
                                    }
                                  ]}
                                />
                              </Popover>
                            </div>
                            <TextField
                              value={opt.name}
                              onChange={(val) => updateVariantOptionName(index, val)}
                              autoComplete="off"
                            />
                            
                            <div style={{ marginTop: '16px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px', color: '#202223' }}>Option values</span>
                            </div>
                            <TextField
                              value={opt.values}
                              onChange={(val) => updateVariantOptionValue(index, val)}
                              placeholder={`Add ${opt.name.toLowerCase() || 'value'}`}
                              autoComplete="off"
                            />
                            
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div 
                                onClick={() => removeVariantOption(index)}
                                style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid #dfe3e8', borderRadius: '4px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                              >
                                <span style={{ color: '#d82c0d', fontSize: '14px', fontWeight: 500 }}>Delete</span>
                              </div>
                              <div 
                                style={{ cursor: 'pointer', padding: '6px 16px', backgroundColor: '#202223', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                              >
                                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>Done</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <Popover
                        active={variantPopoverActive}
                        activator={
                          <div 
                            onClick={() => setVariantPopoverActive(true)}
                            style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                          >
                            <Icon source={CirclePlusMinor} color="base" />
                            <span style={{ fontSize: '14px', color: '#202223', fontWeight: 500 }}>Add another option</span>
                          </div>
                        }
                        onClose={() => setVariantPopoverActive(false)}
                        autofocusTarget="none"
                        preferredAlignment="left"
                      >
                        <div style={{ width: '280px' }}>
                          <div style={{ padding: '12px' }}>
                            <TextField
                              prefix={<Icon source={SearchMinor} color="subdued" />}
                              placeholder="Search"
                              autoComplete="off"
                            />
                            <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                              <Text as="p" color="subdued" variant="bodySm">Recommended</Text>
                            </div>
                            <div 
                              style={{ padding: '6px 12px', margin: '0 -4px', cursor: 'pointer' }}
                              onClick={() => addVariantOption('Selection')}
                            >
                              <span style={{ fontSize: '14px', color: '#202223' }}>Selection</span>
                            </div>
                            <div 
                              onClick={() => addVariantOption('Specification')}
                              style={{ padding: '6px 12px', margin: '0 -4px', cursor: 'pointer' }}
                            >
                              <span style={{ fontSize: '14px', color: '#202223' }}>Specification</span>
                            </div>
                          </div>
                          <div 
                            onClick={() => addVariantOption('')}
                            style={{ borderTop: '1px solid #dfe3e8', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <Icon source={CirclePlusMinor} color="subdued" />
                            <span style={{ fontSize: '14px', color: '#202223' }}>Create custom option</span>
                          </div>
                        </div>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Purchase options" sectioned>
              {purchaseOptions.length === 0 ? (
                <Popover
                  active={purchaseOptionsPopoverActive}
                  activator={
                    <div onClick={() => setPurchaseOptionsPopoverActive(true)} style={{ display: 'inline-flex', cursor: 'pointer' }}>
                      <Button plain icon={CirclePlusMinor}>Subscriptions, preorders, try before you buy, and more</Button>
                    </div>
                  }
                  onClose={() => setPurchaseOptionsPopoverActive(false)}
                  preferredAlignment="left"
                >
                  <ActionList
                    actionRole="menuitem"
                    title="Choose existing"
                    items={availablePurchaseOptions.map(opt => ({
                      content: opt.title,
                      icon: PurchaseIcon,
                      onAction: () => addPurchaseOption(opt.title, opt.desc)
                    }))}
                  />
                </Popover>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                    {purchaseOptions.map((opt, index) => (
                      <div key={index} style={{ padding: '16px', borderBottom: '1px solid #dfe3e8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <PurchaseIcon />
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#202223' }}>{opt.title}</span>
                          </div>
                          <div 
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', margin: '-4px' }}
                            onClick={() => {
                              const newOpts = [...purchaseOptions];
                              newOpts.splice(index, 1);
                              setPurchaseOptions(newOpts);
                            }}
                          >
                            <svg viewBox="0 0 20 20" width="16" height="16" fill="#5c5f62"><path d="M11.414 10l4.293-4.293a.999.999 0 1 0-1.414-1.414L10 8.586 5.707 4.293a.999.999 0 1 0-1.414 1.414L8.586 10l-4.293 4.293a.999.999 0 1 0 1.414 1.414L10 11.414l4.293 4.293a.997.997 0 0 0 1.414 0 .999.999 0 0 0 0-1.414L11.414 10z"/></svg>
                          </div>
                        </div>
                        <div style={{ marginTop: '8px', color: '#202223', fontSize: '14px' }}>
                          {opt.desc}
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '12px 16px', backgroundColor: '#fff' }}>
                      <Popover
                        active={purchaseOptionsPopoverActive}
                        activator={
                          <div onClick={() => setPurchaseOptionsPopoverActive(true)} style={{ display: 'inline-flex', cursor: 'pointer' }}>
                            <Button plain icon={CirclePlusMinor}>Subscriptions, preorders, try before you buy, and more</Button>
                          </div>
                        }
                        onClose={() => setPurchaseOptionsPopoverActive(false)}
                        preferredAlignment="left"
                      >
                        <ActionList
                          actionRole="menuitem"
                          title="Choose existing"
                          items={availablePurchaseOptions.map(opt => ({
                            content: opt.title,
                            icon: PurchaseIcon,
                            onAction: () => addPurchaseOption(opt.title, opt.desc)
                          }))}
                        />
                      </Popover>
                    </div>
                  </div>
                  
                  <div>
                    <Checkbox
                      label="Only sell this product with these purchase options"
                      checked={onlySellWithTheseOptions}
                      onChange={setOnlySellWithTheseOptions}
                    />
                  </div>
                </div>
              )}
            </Card>

            <Card sectioned>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Text variant="headingSm" as="h3">Product metafields</Text>
                <div 
                  onClick={() => setAddMetafieldModalOpen(true)}
                  style={{ cursor: 'pointer', padding: '4px 12px', border: '1px solid #c9cccf', borderRadius: '4px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <span style={{ color: '#202223', fontSize: '14px', fontWeight: 500 }}>Add definition</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', color: '#202223', marginBottom: '4px', fontWeight: 600 }}>Category</span>
                  <TextField labelHidden autoComplete="off" />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '16px' }}>
                  <span style={{ fontSize: '14px', color: '#202223', marginBottom: '4px', fontWeight: 600 }}>Z8 Offers</span>
                  <TextField labelHidden autoComplete="off" />
                </div>

                {disclosuresActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: '16px' }}>
                  <span style={{ fontSize: '14px', color: '#202223', marginBottom: '4px', fontWeight: 600 }}>Disclosures</span>
                  <TextField labelHidden autoComplete="off" />
                </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <div 
                      onClick={() => setDisclosuresActive(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', backgroundColor: '#fff', border: '1px solid #c9cccf', borderRadius: '16px', cursor: 'pointer', gap: '4px', color: '#5c5f62', fontWeight: 500 }}
                    >
                      <svg viewBox="0 0 20 20" width="12" height="12" fill="#5c5f62"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 8h3a1 1 0 1 1 0 2h-3v3a1 1 0 1 1-2 0v-3H6a1 1 0 1 1 0-2h3V6a1 1 0 1 1 2 0v4Z"/></svg>
                      <span style={{ fontSize: '13px', color: '#5c5f62', fontWeight: 500 }}>Disclosures</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#202223' }}>Search engine listing</span>
                  {!seoExpanded && (
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setSeoExpanded(true)}>
                      <Icon source={EditMinor} color="subdued" />
                      <span style={{ marginLeft: '4px', color: '#005e4d', fontWeight: 600, fontSize: '13px' }}>Edit</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6d7175' }}>Add a title and description to see how this product might appear in a search engine listing.</span>
                </div>
              </div>
              {seoExpanded && (
                <>
                  <div style={{ borderTop: '1px solid #dfe3e8' }} />
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <TextField 
                      label="Page title"
                      value={seoTitle}
                      onChange={setSeoTitle}
                      autoComplete="off"
                      maxLength={70}
                      helpText={`${seoTitle.length} of 70 characters used`}
                    />
                    <TextField 
                      label="Meta description"
                      value={seoDescription}
                      onChange={setSeoDescription}
                      autoComplete="off"
                      multiline={4}
                      maxLength={160}
                      helpText={`${seoDescription.length} of 160 characters used`}
                    />
                    <TextField 
                      label="URL handle"
                      value={seoUrl}
                      onChange={setSeoUrl}
                      autoComplete="off"
                      helpText="https://demo1-demo.myshopify.com/products/"
                    />
                  </div>
                </>
              )}
            </Card>
          </Stack>
        </Layout.Section>

        <Layout.Section secondary>
          <Stack vertical spacing="loose">
            <Card title="Status" sectioned>
              <Popover
                active={statusPopoverOpen}
                activator={
                  <div 
                    onClick={() => setStatusPopoverOpen(!statusPopoverOpen)}
                    style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid #c9cccf', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                  >
                    <span style={{ fontSize: '14px', color: '#202223' }}>{status}</span>
                    <div style={{ width: '20px', pointerEvents: 'none', display: 'flex' }}>
                       <Icon source={ChevronDownMinor} color="subdued" />
                    </div>
                  </div>
                }
                onClose={() => setStatusPopoverOpen(false)}
                fullWidth
              >
                <div style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}>
                  {[
                    { value: 'Active', title: 'Active', desc: 'Sell via selected sales channels, catalogs, and markets' },
                    { value: 'Draft', title: 'Draft', desc: 'Not visible on selected sales channels, catalogs, or markets' },
                    { value: 'Unlisted', title: 'Unlisted', desc: 'Accessible only by direct link' },
                  ].map((opt) => (
                    <div 
                      key={opt.value}
                      onClick={() => { setStatus(opt.value); setStatusPopoverOpen(false); }}
                      style={{ 
                        display: 'flex', 
                        padding: '8px', 
                        cursor: 'pointer', 
                        borderRadius: '4px',
                        backgroundColor: status === opt.value ? '#f1f2f3' : 'transparent',
                      }}
                    >
                      <div style={{ width: '24px', flexShrink: 0, marginTop: '2px' }}>
                        {status === opt.value && <Icon source={TickMinor} color="base" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: status === opt.value ? '600' : '400', color: '#202223' }}>{opt.title}</div>
                        <div style={{ fontSize: '13px', color: '#6d7175', marginTop: '2px', lineHeight: '1.4' }}>{opt.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Popover>
              
            </Card>

            <Card>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#202223' }}>Publishing</span>
                  <Tooltip content="Manage publishing" preferredPosition="above">
                    <div 
                      style={{ cursor: 'pointer', color: '#5c5f62', backgroundColor: '#f1f2f3', padding: '4px', borderRadius: '4px', display: 'flex' }} 
                      onClick={() => setPublishingModalOpen(true)}
                    >
                      <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M12.929 4.397a2.5 2.5 0 0 0-4.858 0H2v1.5h6.071a2.5 2.5 0 0 0 4.858 0H18v-1.5h-5.071ZM5.071 14.103a2.5 2.5 0 0 0 4.858 0H18v-1.5h-8.071a2.5 2.5 0 0 0-4.858 0H2v1.5h3.071Z"/></svg>
                    </div>
                  </Tooltip>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div 
                    onClick={() => { setPublishingActiveTab('Sales Channels'); setPublishingModalOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#202223' }}
                  >
                    <div style={{ color: '#202223', display: 'flex' }}>
                      <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M16 11a3 3 0 1 0-2.83 2H9.83a3.001 3.001 0 0 0-5.66 0H4a1 1 0 0 0 0 2h.17a3.001 3.001 0 0 0 5.66 0h3.34A3 3 0 1 0 16 11zm-9 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm9 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0-6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM7 5a3 3 0 1 0-2.83 2H16a1 1 0 1 0 0-2H4.17A3 3 0 0 0 7 5zm-3 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>All channels</span>
                  </div>
                  <div 
                    onClick={() => { setPublishingActiveTab('B2B'); setPublishingModalOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#202223' }}
                  >
                    <div style={{ color: '#202223', display: 'flex' }}>
                      <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M15 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM6 6h8v2H6V6zm0 4h8v2H6v-2z"/></svg>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>All catalogs</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card sectioned>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#202223' }}>Product organization</span>
              </div>
              <FormLayout>
                <div style={{ position: 'relative' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#202223' }}>Type</span>
                  </div>
                  <Popover
                    active={typePopoverOpen}
                    activator={
                      <div 
                        onClick={() => setTypePopoverOpen(!typePopoverOpen)}
                        style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid #c9cccf', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.05)', minHeight: '32px' }}
                      >
                        <span style={{ fontSize: '14px', color: productType === 'None' ? '#8c9196' : '#202223' }}>{productType === 'None' ? '' : productType}</span>
                        <div style={{ display: 'flex', width: '20px', pointerEvents: 'none', color: '#5c5f62' }}>
                          <Icon source={ChevronDownMinor} color="subdued" />
                        </div>
                      </div>
                    }
                    onClose={() => setTypePopoverOpen(false)}
                    fullWidth
                    preferredAlignment="left"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '350px' }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #dfe3e8', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ color: '#5c5f62', display: 'flex' }}>
                          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                            <path d="M8 2a6 6 0 1 0 3.738 10.704l3.555 3.555a.999.999 0 1 0 1.414-1.414l-3.555-3.555A6 6 0 0 0 8 2Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"/><path d="M16 2a1 1 0 0 0-1 1v1h-1a1 1 0 1 0 0 2h1v1a1 1 0 1 0 2 0V6h1a1 1 0 1 0 0-2h-1V3a1 1 0 0 0-1-1Z"/>
                          </svg>
                        </div>
                        <input 
                          type="text" 
                          value={typeSearch} 
                          onChange={(e) => setTypeSearch(e.target.value)} 
                          placeholder="Search or add product type" 
                          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', padding: '4px 0' }}
                          autoFocus
                        />
                      </div>
                      <div style={{ overflowY: 'auto', padding: '8px 0' }}>
                        {orgOptions.types
                        .filter(item => item.toLowerCase().includes(typeSearch.toLowerCase()))
                        .map((item) => (
                          <div 
                            key={item}
                            onClick={() => { setProductType(item); setTypePopoverOpen(false); }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '8px 16px', 
                              cursor: 'pointer', 
                              backgroundColor: productType === item ? '#f1f2f3' : 'transparent',
                            }}
                          >
                            <div style={{ width: '24px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                              {productType === item && <Icon source={TickMinor} color="base" />}
                            </div>
                            <div style={{ fontSize: '14px', color: '#202223' }}>{item}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Popover>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#202223' }}>Vendor</span>
                  </div>
                  <Popover
                    active={vendorPopoverOpen}
                    activator={
                      <div 
                        onClick={() => setVendorPopoverOpen(!vendorPopoverOpen)}
                        style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid #c9cccf', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.05)', minHeight: '32px' }}
                      >
                        <span style={{ fontSize: '14px', color: vendor === 'None' ? '#8c9196' : '#202223' }}>{vendor === 'None' ? '' : vendor}</span>
                        <div style={{ display: 'flex', width: '20px', pointerEvents: 'none', color: '#5c5f62' }}>
                          <Icon source={ChevronDownMinor} color="subdued" />
                        </div>
                      </div>
                    }
                    onClose={() => setVendorPopoverOpen(false)}
                    fullWidth
                    preferredAlignment="left"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '350px' }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #dfe3e8', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ color: '#5c5f62', display: 'flex' }}>
                          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                            <path d="M8 2a6 6 0 1 0 3.738 10.704l3.555 3.555a.999.999 0 1 0 1.414-1.414l-3.555-3.555A6 6 0 0 0 8 2Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"/><path d="M16 2a1 1 0 0 0-1 1v1h-1a1 1 0 1 0 0 2h1v1a1 1 0 1 0 2 0V6h1a1 1 0 1 0 0-2h-1V3a1 1 0 0 0-1-1Z"/>
                          </svg>
                        </div>
                        <input 
                          type="text" 
                          value={vendorSearch} 
                          onChange={(e) => setVendorSearch(e.target.value)} 
                          placeholder="Search or add vendor" 
                          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', padding: '4px 0' }}
                          autoFocus
                        />
                      </div>
                      <div style={{ overflowY: 'auto', padding: '8px 0' }}>
                        {orgOptions.vendors
                        .filter(item => item.toLowerCase().includes(vendorSearch.toLowerCase()))
                        .map((item) => (
                          <div 
                            key={item}
                            onClick={() => { setVendor(item); setVendorPopoverOpen(false); }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '8px 16px', 
                              cursor: 'pointer', 
                              backgroundColor: vendor === item ? '#f1f2f3' : 'transparent',
                            }}
                          >
                            <div style={{ width: '24px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                              {vendor === item && <Icon source={TickMinor} color="base" />}
                            </div>
                            <div style={{ fontSize: '14px', color: '#202223' }}>{item}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Popover>
                </div>
                <Popover
                  active={collectionsPopoverOpen}
                  activator={
                    <div style={{ position: 'relative' }}>
                      <div style={{ marginBottom: '4px' }}>
                         <span style={{ fontSize: '13px', color: '#202223' }}>Collections</span>
                      </div>
                      <div 
                        onClick={() => setCollectionsPopoverOpen(!collectionsPopoverOpen)}
                        style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}
                      >
                        {selectedCollections.length === 0 && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #c9cccf', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', gap: '4px', color: '#5c5f62', fontWeight: 500 }}>
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-2a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm1-5h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H7a1 1 0 1 1 0-2h2V7a1 1 0 1 1 2 0v2Z" clipRule="evenodd"/>
                            </svg>
                            Add collections
                          </div>
                        )}
                        {selectedCollections.map(c => (
                           <div key={c} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#e4e5e7', padding: '2px 8px', borderRadius: '12px', fontSize: '13px' }}>{c}</div>
                        ))}
                      </div>
                    </div>
                  }
                  onClose={() => setCollectionsPopoverOpen(false)}
                  fullWidth
                  preferredAlignment="left"
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 12px 8px 12px', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #dfe3e8' }}>
                      <span style={{ fontSize: '12px', color: '#6d7175' }}>Collections</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ color: '#5c5f62', display: 'flex' }}>
                          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                            <path d="M8 2a6 6 0 1 0 3.738 10.704l3.555 3.555a.999.999 0 1 0 1.414-1.414l-3.555-3.555A6 6 0 0 0 8 2Zm-4 6a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"/><path d="M16 2a1 1 0 0 0-1 1v1h-1a1 1 0 1 0 0 2h1v1a1 1 0 1 0 2 0V6h1a1 1 0 1 0 0-2h-1V3a1 1 0 0 0-1-1Z"/>
                          </svg>
                        </div>
                        <input 
                          type="text" 
                          value={collectionSearch} 
                          onChange={(e) => setCollectionSearch(e.target.value)} 
                          placeholder="Search or add collections" 
                          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', padding: '4px 0' }}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', padding: '8px 0', maxHeight: '200px' }}>
                      {orgOptions.collections.map(c => c.title)
                      .filter(item => item.toLowerCase().includes(collectionSearch.toLowerCase()))
                      .map((item) => {
                        const isSelected = selectedCollections.includes(item);
                        return (
                          <div 
                            key={item}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCollections(selectedCollections.filter(c => c !== item));
                              } else {
                                setSelectedCollections([...selectedCollections, item]);
                              }
                            }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '8px 16px', 
                              cursor: 'pointer',
                              gap: '12px'
                            }}
                          >
                            <div style={{ 
                              width: '16px', height: '16px', border: '1px solid #c9cccf', borderRadius: '4px', 
                              display: 'flex', justifyContent: 'center', alignItems: 'center', 
                              backgroundColor: isSelected ? '#2c6ecb' : '#fff', borderColor: isSelected ? '#2c6ecb' : '#8c9196'
                            }}>
                              {isSelected && <svg viewBox="0 0 20 20" width="12" height="12" fill="#fff"><path d="M8.28 13.93a.999.999 0 0 1-.707-.293l-3.28-3.28a.999.999 0 1 1 1.414-1.414l2.573 2.573 6.28-6.28a.999.999 0 1 1 1.414 1.414l-7 7a.999.999 0 0 1-.707.293z"/></svg>}
                            </div>
                            <div style={{ fontSize: '14px', color: '#202223' }}>{item}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ borderTop: '1px solid #dfe3e8', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#202223' }}>
                      <div style={{ display: 'flex', color: '#5c5f62' }}>
                        <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-2a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm1-5h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H7a1 1 0 1 1 0-2h2V7a1 1 0 1 1 2 0v2Z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Add new collection</span>
                    </div>
                  </div>
                </Popover>
                <Popover
                  active={tagsPopoverOpen}
                  activator={
                    <div style={{ position: 'relative' }}>
                      <div style={{ marginBottom: '4px' }}>
                         <span style={{ fontSize: '13px', color: '#202223' }}>Tags</span>
                      </div>
                      <div 
                        onClick={() => setTagsPopoverOpen(!tagsPopoverOpen)}
                        style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}
                      >
                        {selectedTags.length === 0 && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #c9cccf', padding: '4px 12px', borderRadius: '16px', fontSize: '13px', gap: '4px', color: '#5c5f62', fontWeight: 500 }}>
                            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-2a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm1-5h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H7a1 1 0 1 1 0-2h2V7a1 1 0 1 1 2 0v2Z" clipRule="evenodd"/>
                            </svg>
                            Add tags
                          </div>
                        )}
                        {selectedTags.map(t => (
                           <div key={t} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#e4e5e7', padding: '2px 8px', borderRadius: '12px', fontSize: '13px' }}>{t}</div>
                        ))}
                      </div>
                    </div>
                  }
                  onClose={() => setTagsPopoverOpen(false)}
                  fullWidth
                  preferredAlignment="left"
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 12px 8px 12px', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #dfe3e8' }}>
                      <span style={{ fontSize: '12px', color: '#6d7175' }}>Tags</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ color: '#5c5f62', display: 'flex' }}>
                          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path fillRule="evenodd" d="M13.28 14.341a6.5 6.5 0 1 1 1.06-1.06l4.44 4.439a.75.75 0 0 1-1.06 1.06l-4.44-4.439ZM14 8.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z" clipRule="evenodd"/></svg>
                        </div>
                        <input 
                          type="text" 
                          value={tagSearch} 
                          onChange={(e) => setTagSearch(e.target.value)} 
                          placeholder="Search or add tags" 
                          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', padding: '4px 0' }}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', padding: '8px 0', maxHeight: '250px' }}>
                      <div style={{ padding: '4px 16px', fontSize: '12px', color: '#6d7175' }}>Frequently used</div>
                      {orgOptions.tags
                      .filter(item => item.toLowerCase().includes(tagSearch.toLowerCase()))
                      .map((item) => {
                        const isSelected = selectedTags.includes(item);
                        return (
                          <div 
                            key={item}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTags(selectedTags.filter(t => t !== item));
                              } else {
                                setSelectedTags([...selectedTags, item]);
                              }
                            }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '8px 16px', 
                              cursor: 'pointer',
                              gap: '12px',
                              backgroundColor: isSelected ? '#f1f2f3' : 'transparent'
                            }}
                          >
                            <div style={{ 
                              width: '16px', height: '16px', border: '1px solid #c9cccf', borderRadius: '4px', 
                              display: 'flex', justifyContent: 'center', alignItems: 'center', 
                              backgroundColor: isSelected ? '#2c6ecb' : '#fff', borderColor: isSelected ? '#2c6ecb' : '#8c9196'
                            }}>
                              {isSelected && <svg viewBox="0 0 20 20" width="12" height="12" fill="#fff"><path d="M8.28 13.93a.999.999 0 0 1-.707-.293l-3.28-3.28a.999.999 0 1 1 1.414-1.414l2.573 2.573 6.28-6.28a.999.999 0 1 1 1.414 1.414l-7 7a.999.999 0 0 1-.707.293z"/></svg>}
                            </div>
                            <div style={{ fontSize: '14px', color: '#202223' }}>{item}</div>
                          </div>
                        );
                      })}
                      
                      <div style={{ padding: '12px 16px 4px 16px', fontSize: '12px', color: '#6d7175' }}>Other tags</div>
                      {['215', 'AA01', 'Allow_Discount', 'Archived']
                      .filter(item => item.toLowerCase().includes(tagSearch.toLowerCase()))
                      .map((item) => {
                        const isSelected = selectedTags.includes(item);
                        return (
                          <div 
                            key={item}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTags(selectedTags.filter(t => t !== item));
                              } else {
                                setSelectedTags([...selectedTags, item]);
                              }
                            }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '8px 16px', 
                              cursor: 'pointer',
                              gap: '12px',
                              backgroundColor: isSelected ? '#f1f2f3' : 'transparent'
                            }}
                          >
                            <div style={{ 
                              width: '16px', height: '16px', border: '1px solid #c9cccf', borderRadius: '4px', 
                              display: 'flex', justifyContent: 'center', alignItems: 'center', 
                              backgroundColor: isSelected ? '#2c6ecb' : '#fff', borderColor: isSelected ? '#2c6ecb' : '#8c9196'
                            }}>
                              {isSelected && <svg viewBox="0 0 20 20" width="12" height="12" fill="#fff"><path d="M8.28 13.93a.999.999 0 0 1-.707-.293l-3.28-3.28a.999.999 0 1 1 1.414-1.414l2.573 2.573 6.28-6.28a.999.999 0 1 1 1.414 1.414l-7 7a.999.999 0 0 1-.707.293z"/></svg>}
                            </div>
                            <div style={{ fontSize: '14px', color: '#202223' }}>{item}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Popover>
              </FormLayout>
            </Card>

            <Card title="Theme template" sectioned>
              <Popover
                active={templatePopoverOpen}
                activator={
                  <div 
                    onClick={() => setTemplatePopoverOpen(!templatePopoverOpen)}
                    style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid #c9cccf', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.05)', minHeight: '32px' }}
                  >
                    <span style={{ fontSize: '14px', color: '#202223' }}>{selectedTemplate}</span>
                    <div style={{ display: 'flex', width: '20px', pointerEvents: 'none', color: '#5c5f62' }}>
                      <Icon source={ChevronDownMinor} color="subdued" />
                    </div>
                  </div>
                }
                onClose={() => setTemplatePopoverOpen(false)}
                fullWidth
                preferredAlignment="left"
              >
                <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                  {['Default product', 'best-saller'].map((item) => {
                    const isSelected = selectedTemplate === item;
                    return (
                      <div 
                        key={item}
                        onClick={() => { setSelectedTemplate(item); setTemplatePopoverOpen(false); }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          padding: '6px 12px', 
                          margin: '0 8px',
                          borderRadius: '4px',
                          cursor: 'pointer', 
                          backgroundColor: isSelected ? '#f1f2f3' : 'transparent',
                          gap: '8px'
                        }}
                      >
                        <div style={{ width: '20px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          {isSelected && <Icon source={TickMinor} color="base" />}
                        </div>
                        <div style={{ fontSize: '14px', color: '#202223' }}>{item}</div>
                      </div>
                    );
                  })}
                </div>
              </Popover>
            </Card>
          </Stack>
        </Layout.Section>
      </Layout>
      {storeMediaModalOpen && (
        <FileSelectorModal
          open={storeMediaModalOpen}
          onClose={() => setStoreMediaModalOpen(false)}
          onSelect={handleStoreMediaSelect}
          multiSelect={true}
        />
      )}
      {locationsModalOpen && (
        <Modal
          open={locationsModalOpen}
          onClose={() => setLocationsModalOpen(false)}
          title="Edit inventory locations"
          primaryAction={{
            content: 'Save',
            onAction: () => setLocationsModalOpen(false),
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setLocationsModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p" variant="bodyMd" style={{ marginBottom: '16px' }}>Selected locations fulfill orders for this variant</Text>
            <TextField
              prefix={<Icon source={SearchMinor} color="subdued" />}
              placeholder="Search locations"
              autoComplete="off"
            />
            <div style={{ marginTop: '16px', border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #dfe3e8', backgroundColor: '#fafbfb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Checkbox 
                    checked={locations.every(l => l.disabled ? true : l.checked)} 
                    onChange={(v) => {
                      setLocations(locations.map(l => l.disabled ? l : { ...l, checked: v }));
                    }} 
                  />
                  <Text as="span" fontWeight="medium">Location</Text>
                </div>
                <Text as="span" fontWeight="medium">On hand</Text>
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {locations.map((loc, i) => (
                  <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i === locations.length - 1 ? 'none' : '1px solid #dfe3e8', opacity: loc.disabled ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ marginTop: '2px' }}>
                        <Checkbox 
                          checked={loc.checked} 
                          disabled={loc.disabled}
                          onChange={(v) => {
                            const newLocs = [...locations];
                            const idx = newLocs.findIndex(l => l.id === loc.id);
                            newLocs[idx].checked = v;
                            setLocations(newLocs);
                          }} 
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {loc.app && <span style={{ backgroundColor: '#ebebeb', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#5c5f62' }}>App</span>}
                          <Text as="span" color={loc.disabled ? "subdued" : undefined}>{loc.name}</Text>
                        </div>
                        {loc.subtitle && <Text as="p" color="subdued" variant="bodySm" style={{ marginTop: '4px' }}>{loc.subtitle}</Text>}
                      </div>
                    </div>
                    <Text as="span" color={loc.disabled ? "subdued" : undefined}>{loc.disabled ? '' : loc.quantity}</Text>
                  </div>
                ))}
              </div>
            </div>
          </Modal.Section>
        </Modal>
      )}

      <Modal
        open={hsModalOpen}
        onClose={() => setHsModalOpen(false)}
        title="Add HS codes by country/region"
        primaryAction={{
          content: 'Add',
          onAction: () => setHsModalOpen(false),
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setHsModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {hsCountryCodes.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    labelHidden
                    label="Country/Region"
                    options={allCountries}
                    value={item.country}
                    onChange={(val) => updateHsCountry(index, val)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    labelHidden
                    label="HS code"
                    placeholder="Enter HS code"
                    value={item.code}
                    onChange={(val) => updateHsCode(index, val)}
                    autoComplete="off"
                  />
                </div>
                <div 
                  onClick={() => removeHsCountryCode(index)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '36px' }}
                >
                  <Icon source={DeleteMinor} color="subdued" />
                </div>
              </div>
            ))}
            <div>
              <Button plain icon={CirclePlusMinor} onClick={addHsCountryCode}>
                Add country/region
              </Button>
            </div>
          </div>
        </Modal.Section>
      </Modal>

      
      {publishingModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '8px', width: '900px', height: '700px',
            display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #dfe3e8' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#202223' }}>Manage publishing</span>
              <div onClick={() => setPublishingModalOpen(false)} style={{ cursor: 'pointer' }}>
                <svg viewBox="0 0 20 20" width="20" height="20" fill="#5c5f62"><path d="M11.414 10l4.293-4.293a.999.999 0 1 0-1.414-1.414L10 8.586 5.707 4.293a.999.999 0 1 0-1.414 1.414L8.586 10l-4.293 4.293a.999.999 0 1 0 1.414 1.414L10 11.414l4.293 4.293a.997.997 0 0 0 1.414 0 .999.999 0 0 0 0-1.414L11.414 10z" /></svg>
              </div>
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              <div style={{ width: '240px', backgroundColor: '#f6f6f7', borderRight: '1px solid #dfe3e8', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                <div 
                  onClick={() => setPublishingActiveTab('Sales Channels')}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', backgroundColor: publishingActiveTab === 'Sales Channels' ? '#e4e5e7' : 'transparent', fontWeight: publishingActiveTab === 'Sales Channels' ? '600' : '400', color: '#202223' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M16 11a3 3 0 1 0-2.83 2H9.83a3.001 3.001 0 0 0-5.66 0H4a1 1 0 0 0 0 2h.17a3.001 3.001 0 0 0 5.66 0h3.34A3 3 0 1 0 16 11zm-9 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm9 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0-6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM7 5a3 3 0 1 0-2.83 2H16a1 1 0 1 0 0-2H4.17A3 3 0 0 0 7 5zm-3 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                    <span style={{ fontSize: '13px' }}>Sales Channels</span>
                  </div>
                  <div style={{ backgroundColor: '#e4e5e7', borderRadius: '12px', padding: '0 8px', fontSize: '12px', display: 'flex', alignItems: 'center', color: '#5c5f62' }}>7</div>
                </div>
                
                <div 
                  onClick={() => setPublishingActiveTab('Agentic')}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', backgroundColor: publishingActiveTab === 'Agentic' ? '#e4e5e7' : 'transparent', fontWeight: publishingActiveTab === 'Agentic' ? '600' : '400', color: '#202223' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M16 4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v1h12V4zm1 3H3v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7zM7 10h6v2H7v-2z"/></svg>
                    <span style={{ fontSize: '13px' }}>Agentic</span>
                  </div>
                  <div style={{ backgroundColor: '#e4e5e7', borderRadius: '12px', padding: '0 8px', fontSize: '12px', display: 'flex', alignItems: 'center', color: '#5c5f62' }}>1</div>
                </div>

                <div style={{ marginTop: '16px', padding: '0 12px', fontSize: '12px', fontWeight: 600, color: '#6d7175' }}>Catalogs</div>
                
                <div 
                  onClick={() => setPublishingActiveTab('B2B')}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', backgroundColor: publishingActiveTab === 'B2B' ? '#e4e5e7' : 'transparent', fontWeight: publishingActiveTab === 'B2B' ? '600' : '400', color: '#202223' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M15 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM6 6h8v2H6V6zm0 4h8v2H6v-2z"/></svg>
                    <span style={{ fontSize: '13px' }}>B2B</span>
                  </div>
                  <div style={{ backgroundColor: '#e4e5e7', borderRadius: '12px', padding: '0 8px', fontSize: '12px', display: 'flex', alignItems: 'center', color: '#5c5f62' }}>1</div>
                </div>
              </div>

              <div style={{ flex: 1, padding: '24px', backgroundColor: '#fff', overflowY: 'auto' }}>
                {publishingActiveTab === 'Sales Channels' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <TextField prefix={<Icon source={SearchMinor} color="subdued" />} placeholder="Search channels" autoComplete="off" labelHidden label="Search channels" />
                    <div style={{ border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#fafbfb', padding: '12px 16px', borderBottom: '1px solid #dfe3e8', fontWeight: 600, color: '#6d7175', fontSize: '13px' }}>
                        Sales Channels
                      </div>
                      {[
                        { name: 'Online Store', icon: 'M16 4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v1h12V4zm1 3H3v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7zM7 10h6v2H7v-2z' },
                        { name: 'Point of Sale', icon: 'M10 2a2 2 0 0 0-2 2v1H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2V4a2 2 0 0 0-2-2zm-1 3V4h2v1H9zM7 7h6v9H7V7z' },
                        { name: 'Shopify GraphiQL App', icon: 'M16 11a3 3 0 1 0-2.83 2H9.83a3.001 3.001 0 0 0-5.66 0H4a1 1 0 0 0 0 2h.17a3.001 3.001 0 0 0 5.66 0h3.34A3 3 0 1 0 16 11z' },
                        { name: 'Moshocart - Mobile App Builder', icon: 'M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6zm0 2h8v10H6V4zm4 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z' },
                        { name: 'Superfans (prev. Vajro)', icon: 'M10 2l6 4-6 12-6-12 6-4z' },
                        { name: 'Evlop - Mobile app', icon: 'M4 4h12v12H4z' },
                        { name: 'Mobile App Builder', icon: 'M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6zm0 2h8v10H6V4zm4 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z' },
                      ].map((ch, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: idx < 6 ? '1px solid #dfe3e8' : 'none', backgroundColor: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '20px', display: 'flex', justifyContent: 'center', color: '#5c5f62' }}>
                              <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d={ch.icon}/></svg>
                            </div>
                            <span style={{ fontSize: '14px', color: '#202223', fontWeight: 500 }}>{ch.name}</span>
                          </div>
                          <div style={{width:'36px',height:'20px',borderRadius:'10px',backgroundColor:'#2c6ecb',position:'relative', cursor: 'pointer'}}>
                            <div style={{width:'16px',height:'16px',borderRadius:'8px',backgroundColor:'#fff',position:'absolute',top:'2px',right:'2px'}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {publishingActiveTab === 'Agentic' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#fafbfb', padding: '12px 16px', borderBottom: '1px solid #dfe3e8', fontWeight: 600, color: '#6d7175', fontSize: '13px' }}>
                        Agentic
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#202223', fontWeight: 500 }}>Shopify Catalog</span>
                          <span style={{ fontSize: '13px', color: '#6d7175' }}>Shares product data with Agentic Storefronts</span>
                        </div>
                        <div style={{ color: '#5c5f62' }}>
                          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path fillRule="evenodd" d="M10 20c5.514 0 10-4.486 10-10S15.514 0 10 0 0 4.486 0 10s4.486 10 10 10zm1-6a1 1 0 1 1-2 0v-4a1 1 0 1 1 2 0v4zm-1-9a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" clipRule="evenodd"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {publishingActiveTab === 'B2B' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <TextField prefix={<Icon source={SearchMinor} color="subdued" />} placeholder="Search catalogs" autoComplete="off" labelHidden label="Search catalogs" />
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', border: '1px solid #c9cccf', borderRadius: '4px', gap: '4px', fontSize: '13px', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.05)', cursor: 'pointer', color: '#202223' }}>
                        Status 
                        <div style={{ display: 'flex', width: '16px', height: '16px', color: '#5c5f62' }}>
                          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.098 8h-6.196c-.751 0-1.172.754-.708 1.268l3.098 3.432c.36.399 1.055.399 1.416 0l3.098-3.433c.464-.513.043-1.267-.708-1.267Z"/></svg>
                        </div>
                      </div>
                    </div>
                    <div style={{ border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#fafbfb', padding: '12px 16px', borderBottom: '1px solid #dfe3e8', fontWeight: 600, color: '#6d7175', fontSize: '13px' }}>
                        Catalogs
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', opacity: 0.6, backgroundColor: '#fff' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ marginTop: '2px', color: '#5c5f62' }}>
                            <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM9 13h2v2H9v-2zm0-8h2v6H9V5z"/></svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', color: '#6d7175', fontWeight: 500 }}>testing</span>
                            <span style={{ fontSize: '13px', color: '#8c9196' }}>B2B</span>
                          </div>
                        </div>
                        <div style={{width:'36px',height:'20px',borderRadius:'10px',backgroundColor:'#e4e5e7',position:'relative'}}>
                          <div style={{width:'16px',height:'16px',borderRadius:'8px',backgroundColor:'#fff',position:'absolute',top:'2px',left:'2px',boxShadow:'0 1px 2px rgba(0,0,0,0.1)'}}/>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #dfe3e8', gap: '12px', backgroundColor: '#fff', borderRadius: '0 0 8px 8px' }}>
              <div 
                onClick={() => setPublishingModalOpen(false)}
                style={{ cursor: 'pointer', padding: '6px 16px', border: '1px solid #c9cccf', borderRadius: '4px', fontSize: '14px', fontWeight: 500, color: '#202223', boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
              >
                Cancel
              </div>
              <div 
                onClick={() => setPublishingModalOpen(false)}
                style={{ cursor: 'pointer', padding: '6px 16px', backgroundColor: '#e4e5e7', color: '#8c9196', borderRadius: '4px', fontSize: '14px', fontWeight: 600 }}
              >
                Done
              </div>
            </div>
          </div>
        </div>
      )}
{addMetafieldModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px'
        }}>
          <div style={{
            width: '100%', maxWidth: '720px', height: '100%', maxHeight: '85vh',
            backgroundColor: '#f4f6f8', borderRadius: '8px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#fff', borderBottom: '1px solid #dfe3e8', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: '#202223', display: 'flex' }}>
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 2c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 7.352 18 6.262 18 5c0-1.657-3.582-3-8-3Zm0 5c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 12.352 18 11.262 18 10c0-1.657-3.582-3-8-3v1.889c0 1.657-3.582 3-8 3s-8-1.343-8-3V7Zm0 5c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 17.352 18 16.262 18 15c0-1.657-3.582-3-8-3v1.889c0 1.657-3.582 3-8 3s-8-1.343-8-3v-1.889Z"/></svg>
                </div>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#202223' }}>Add product metafield definition</span>
              </div>
              <div 
                onClick={() => setAddMetafieldModalOpen(false)}
                style={{ cursor: 'pointer', padding: '4px 12px', border: '1px solid #c9cccf', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                <span style={{ color: '#202223', fontSize: '13px', fontWeight: 500 }}>Close</span>
              </div>
            </div>
            
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%', margin: '0 auto' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <FormLayout>
                    <TextField label="Name" autoComplete="off" />
                    <div style={{ position: 'relative' }}>
                      <Popover
                        active={metafieldTypeSelectPopoverOpen}
                        activator={
                          <div 
                            onClick={() => { setMetafieldTypeSelectPopoverOpen(!metafieldTypeSelectPopoverOpen); setMetafieldTypeValuePopoverOpen(false); }}
                            style={{ cursor: 'pointer' }}
                          >
                            <TextField 
                              label="Type"
                              autoComplete="off"
                              placeholder="Select type"
                              readOnly
                              value={metafieldSelectedType}
                              onChange={() => {}}
                              prefix={
                                <Popover
                                  active={metafieldTypeValuePopoverOpen}
                                  activator={
                                    <div 
                                      onClick={(e) => { e.stopPropagation(); setMetafieldTypeValuePopoverOpen(!metafieldTypeValuePopoverOpen); setMetafieldTypeSelectPopoverOpen(false); }}
                                      style={{ display: 'flex', alignItems: 'center', paddingRight: '8px', marginRight: '4px', borderRight: '1px solid #c9cccf', cursor: 'pointer' }}
                                    >
                                      <span style={{ fontSize: '14px', color: '#202223', marginRight: '4px' }}>
                                        {metafieldValueType === 'list' ? 'List' : 'One'}
                                      </span>
                                      <Icon source={ChevronDownMinor} color="subdued" />
                                    </div>
                                  }
                                  onClose={() => setMetafieldTypeValuePopoverOpen(false)}
                                  preferredAlignment="left"
                                >
                                  <ActionList
                                    actionRole="menuitem"
                                    items={[
                                      {
                                        content: 'One value',
                                        icon: () => (
                                          <div style={{ color: '#5c5f62', display: 'flex' }}>
                                            <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm-.5 3.5h1.5v6H9v-6z"/></svg>
                                          </div>
                                        ),
                                        active: metafieldValueType === 'one',
                                        onAction: () => { setMetafieldValueType('one'); setMetafieldTypeValuePopoverOpen(false); }
                                      },
                                      {
                                        content: 'List of values',
                                        icon: () => (
                                          <div style={{ color: '#5c5f62', display: 'flex' }}>
                                            <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M4 6h2v2H4V6zm4 0h8v2H8V6zm-4 4h2v2H4v-2zm4 0h8v2H8v-2zm-4 4h2v2H4v-2zm4 0h8v2H8v-2z"/></svg>
                                          </div>
                                        ),
                                        active: metafieldValueType === 'list',
                                        onAction: () => { setMetafieldValueType('list'); setMetafieldTypeValuePopoverOpen(false); }
                                      }
                                    ]}
                                  />
                                </Popover>
                              }
                            />
                            <div 
                              onClick={(e) => { 
                                if (metafieldSelectedType) {
                                  e.stopPropagation(); 
                                  setMetafieldSelectedType(''); 
                                }
                              }}
                              style={{ position: 'absolute', right: '12px', top: '33px', cursor: metafieldSelectedType ? 'pointer' : 'default', display: 'flex', alignItems: 'center', padding: '4px', zIndex: 2 }}
                            >
                              {metafieldSelectedType ? (
                                <svg viewBox="0 0 20 20" width="12" height="12" fill="#5c5f62" style={{ marginTop: '2px' }}><path d="M11.414 10l4.293-4.293a.999.999 0 1 0-1.414-1.414L10 8.586 5.707 4.293a.999.999 0 1 0-1.414 1.414L8.586 10l-4.293 4.293a.999.999 0 1 0 1.414 1.414L10 11.414l4.293 4.293a.997.997 0 0 0 1.414 0 .999.999 0 0 0 0-1.414L11.414 10z" /></svg>
                              ) : (
                                <Icon source={ChevronDownMinor} color="subdued" />
                              )}
                            </div>
                            
                          </div>
                        }
                        onClose={() => { setMetafieldTypeSelectPopoverOpen(false); setActiveDrilldown(null); }}
                        fullWidth
                        preferredAlignment="left"
                      >
                        <div style={{ width: '100%', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                          {activeDrilldown === 'metaobject' || activeDrilldown === 'mixed' ? (
                            <>
                              <div style={{ padding: '12px', borderBottom: '1px solid #dfe3e8', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                                <TextField 
                                  prefix={<Icon source={SearchMinor} color="subdued" />} 
                                  placeholder="Search metaobjects" 
                                  autoComplete="off" 
                                  labelHidden
                                  label="Search metaobjects"
                                />
                              </div>
                              <div 
                                onClick={() => setActiveDrilldown(null)}
                                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #dfe3e8', fontWeight: 600, color: '#202223' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <svg viewBox="0 0 20 20" width="16" height="16" fill="#5c5f62"><path d="M12 16a.997.997 0 0 1-.707-.293l-5-5a.999.999 0 0 1 0-1.414l5-5a.999.999 0 1 1 1.414 1.414L8.414 10l4.293 4.293A.999.999 0 0 1 12 16z"/></svg>
                                </div>
                                {activeDrilldown === 'mixed' ? 'Mixed reference' : 'Metaobjects'}
                              </div>
                              <div style={{ overflowY: 'auto', padding: '8px 0', flex: 1 }}>
                                <ActionList
                                  items={[
                                    { content: 'Reviews product group' },
                                    { content: 'app--144550--storefront_values' },
                                    { content: 'T-shirt info-2' },
                                    { content: 'T-shirt info' },
                                    { content: 'Age group' },
                                    { content: 'Size' },
                                    { content: 'Neckline' },
                                    { content: 'Fabric' },
                                    { content: 'Sleeve length type' },
                                    { content: 'Sneaker style' },
                                    ...(activeDrilldown === 'mixed' ? [
                                      { content: 'Color' },
                                      { content: 'Specification Tables' },
                                      { content: 'Selections' },
                                      { content: 'app--148910571521--product_highlight' }
                                    ] : [])
                                  ].map(i => ({ 
                                    ...i, 
                                    icon: activeDrilldown === 'mixed' ? () => (
                                      <div style={{ color: '#8c9196', display: 'flex', width: '20px', justifyContent: 'center', alignItems: 'center' }}>
                                        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="16" height="16" rx="3" /></svg>
                                      </div>
                                    ) : undefined,
                                    onAction: () => { setMetafieldSelectedType(i.content); setMetafieldTypeSelectPopoverOpen(false); setActiveDrilldown(null); } 
                                  }))}
                                />
                              </div>
                              <div style={{ borderTop: '1px solid #dfe3e8', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#202223', backgroundColor: '#fafbfb' }}>
                                <Icon source={CirclePlusMinor} color="base" />
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>Create new</span>
                              </div>
                            </>
                          ) : activeDrilldown === 'measurement' ? (
                            <>
                              <div style={{ padding: '12px', borderBottom: '1px solid #dfe3e8', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                                <TextField 
                                  prefix={<Icon source={SearchMinor} color="subdued" />} 
                                  placeholder="Search measurements" 
                                  autoComplete="off" 
                                  labelHidden
                                  label="Search measurements"
                                />
                              </div>
                              <div 
                                onClick={() => setActiveDrilldown(null)}
                                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #dfe3e8', fontWeight: 600, color: '#202223' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <svg viewBox="0 0 20 20" width="16" height="16" fill="#5c5f62"><path d="M12 16a.997.997 0 0 1-.707-.293l-5-5a.999.999 0 0 1 0-1.414l5-5a.999.999 0 1 1 1.414 1.414L8.414 10l4.293 4.293A.999.999 0 0 1 12 16z"/></svg>
                                </div>
                                Measurements
                              </div>
                              <div style={{ overflowY: 'auto', padding: '8px 0', flex: 1 }}>
                                <ActionList
                                  items={[
                                    'Weight', 'Volume', 'Dimension', 'Antenna gain', 'Area', 
                                    'Battery charge capacity', 'Battery energy capacity', 'Capacitance', 
                                    'Concentration', 'Data storage capacity', 'Data transfer rate'
                                  ].map(i => ({ 
                                    content: i,
                                    icon: () => (
                                      <div style={{ color: '#5c5f62', display: 'flex', width: '20px', justifyContent: 'center' }}>
                                        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M10 2a2 2 0 0 0-2 2v1a1 1 0 0 0-1 1v1H3v2h14V7h-4V6a1 1 0 0 0-1-1V4a2 2 0 0 0-2-2zM8 4a2 2 0 0 1 4 0v1H8V4zM2 10v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6H2zm2 2h12v4H4v-4z"/></svg>
                                      </div>
                                    ),
                                    onAction: () => { setMetafieldSelectedType(i); setMetafieldTypeSelectPopoverOpen(false); setActiveDrilldown(null); } 
                                  }))}
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ padding: '12px', borderBottom: '1px solid #dfe3e8', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                                <TextField 
                                  prefix={<Icon source={SearchMinor} color="subdued" />} 
                                  placeholder="Search" 
                                  autoComplete="off" 
                                  labelHidden
                                  label="Search"
                                />
                              </div>
                              <div style={{ overflowY: 'auto', padding: '0 0 8px 0' }}>
                                <ActionList
                                  sections={[
                                    {
                                      title: 'Recommended',
                                      items: [
                                        { content: 'Single line text' },
                                        { content: 'Multi-line text' },
                                        { content: 'Integer' },
                                        { content: 'Image (File)' },
                                        { content: 'Metaobject', suffix: <span style={{display: 'flex'}}><Icon source={ChevronDownMinor} /></span> }
                                      ]
                                    },
                                    {
                                      title: 'Text',
                                      items: [
                                        { content: 'Multi-line text' },
                                        { content: 'Rich text' },
                                        { content: 'Single line text' },
                                        { content: 'Choice list (Single line text)' },
                                        { content: 'Email (Single line text)' }
                                      ]
                                    },
                                    {
                                      title: 'Media',
                                      items: [
                                        { content: 'File' },
                                        { content: 'Image (File)' },
                                        { content: 'Video (File)' }
                                      ]
                                    },
                                    {
                                      title: 'Reference',
                                      items: [
                                        { content: 'Blog post' },
                                        { content: 'Collection' },
                                        { content: 'Company' },
                                        { content: 'Customer' },
                                        { content: 'Metaobject', suffix: <span style={{display: 'flex'}}><Icon source={ChevronDownMinor} /></span> },
                                        { content: 'Order' },
                                        { content: 'Page' },
                                        { content: 'Product' },
                                        { content: 'Product variant' }
                                      ]
                                    },
                                    {
                                      title: 'Number',
                                      items: [
                                        { content: 'ID' },
                                        { content: 'Money' },
                                        { content: 'Decimal' },
                                        { content: 'Integer' },
                                        { content: 'Rating' },
                                        { content: 'Measurement', suffix: <span style={{display: 'flex'}}><Icon source={ChevronDownMinor} /></span> }
                                      ]
                                    },
                                    {
                                      title: 'Link',
                                      items: [
                                        { content: 'Link' },
                                        { content: 'URL' }
                                      ]
                                    },
                                    {
                                      title: 'Date and time',
                                      items: [
                                        { content: 'Date' },
                                        { content: 'Date and time' }
                                      ]
                                    },
                                    {
                                      title: 'Other',
                                      items: [
                                        { content: 'True or false' },
                                        { content: 'Color' },
                                        { content: 'Language' }
                                      ]
                                    },
                                    {
                                      title: 'Advanced',
                                      items: [
                                        { content: 'JSON' },
                                        { content: 'Mixed reference', suffix: <span style={{display: 'flex'}}><Icon source={ChevronDownMinor} /></span> }
                                      ]
                                    }
                                  ].map(section => ({
                                    ...section,
                                    items: section.items.map(item => ({
                                      ...item,
                                      icon: item.icon || (() => {
                                          let path = "M12.6 4a2.9 2.9 0 0 1 2.9 2.9v1.6a1 1 0 1 1-2 0V7a1 1 0 0 0-1-1H9.4a1 1 0 0 0-1 1v2.6l1.3-1.3a1 1 0 0 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0l-3-3a1 1 0 0 1 1.4-1.4L6.4 9.6V7a3 3 0 0 1 3-3h3.2zm-5.2 12a2.9 2.9 0 0 1-2.9-2.9v-1.6a1 1 0 1 1 2 0v1.5a1 1 0 0 0 1 1h3.2a1 1 0 0 0 1-1v-2.6l-1.3 1.3a1 1 0 1 1-1.4-1.4l3-3a1 1 0 0 1 1.4 0l3 3a1 1 0 1 1-1.4 1.4L13.6 10.4V13a3 3 0 0 1-3 3H7.4z";
                                          if (item.content.includes("text") || item.content === "Email (Single line text)" || item.content === "Language" || item.content === "JSON") {
                                             path = "M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h10v2H3v-2z";
                                          } else if (item.content === "Integer" || item.content === "Decimal" || item.content === "Money" || item.content === "Rating" || item.content === "Measurement") {
                                             path = "M7 3v3H4v2h3v4H4v2h3v3h2v-3h4v3h2v-3h3v-2h-3V8h3V6h-3V3h-2v3H9V3H7zm2 5h4v4H9V8z";
                                          } else if (item.content.includes("File") || item.content.includes("Image") || item.content.includes("Video") || item.content === "Color") {
                                             path = "M4 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4zm0 2h12v7.6l-3.3-3.3a1 1 0 0 0-1.4 0L7 13.6 5.7 12.3a1 1 0 0 0-1.4 0L3 13.6V5h1zm2.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z";
                                          } else if (item.content.includes("Date")) {
                                             path = "M15 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H5V8h10v7zm0-9H5V5h10v1z";
                                          } else if (item.content === "True or false") {
                                             path = "M13 6a4 4 0 0 1 0 8H7a4 4 0 0 1 0-8h6zm0 2H7a2 2 0 1 0 0 4h6a2 2 0 1 0 0-4zm0 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2z";
                                          }
                                          return (
                                            <div style={{ color: '#5c5f62', display: 'flex', width: '20px', justifyContent: 'center' }}>
                                              <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d={path}/></svg>
                                            </div>
                                          );
                                      }),
                                      onAction: item.content === 'Metaobject' 
                                        ? () => setActiveDrilldown('metaobject') 
                                        : item.content === 'Measurement' 
                                          ? () => setActiveDrilldown('measurement')
                                          : item.content === 'Mixed reference'
                                            ? () => setActiveDrilldown('mixed')
                                            : () => { setMetafieldSelectedType(item.content); setMetafieldTypeSelectPopoverOpen(false); setActiveDrilldown(null); }
                                    }))
                                  }))}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </Popover>
                    </div>
                    <div style={{ marginTop: '-8px' }}>
                      <span style={{ color: '#2c6ecb', fontSize: '13px', cursor: 'pointer' }}>Add description</span>
                    </div>
                  </FormLayout>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#202223' }}>Options</span>
                    <div style={{ color: '#8c9196', width: '16px', height: '16px' }}>
                      <Icon source={InfoMinor} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #dfe3e8' }}>
                    <span style={{ fontSize: '14px', color: '#202223' }}>Storefront API access</span>
                    <div 
                      onClick={() => setApiAccess(!apiAccess)}
                      style={{ 
                        width: '36px', height: '20px', backgroundColor: apiAccess ? '#2c6ecb' : '#dfe3e8', 
                        borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' 
                      }}
                    >
                      <div style={{
                        width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%',
                        position: 'absolute', top: '2px', left: apiAccess ? '18px' : '2px', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
