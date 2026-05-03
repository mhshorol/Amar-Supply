import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Minus,
  Package,
  Truck,
  CreditCard,
  X,
  Trash2,
  UserCheck,
  AlertCircle,
  ArrowLeft,
  Save,
  Search,
  ChevronDown,
  Smartphone,
  ShieldCheck,
  Phone,
  User,
  CheckCircle,
  ScanBarcode,
  ShoppingCart,
  ShoppingBag,
  ListFilter,
  Banknote,
  Facebook,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  db,
  auth,
  collection,
  query,
  serverTimestamp,
  Timestamp,
  doc,
  getDocs,
  where,
  runTransaction,
  limit,
} from "../firebase";
import { toast } from "sonner";
import { logActivity } from "../services/activityService";
import { checkDuplicateOrder } from "../services/orderService";
import { sendOrderConfirmationSMS } from "../services/smsService";
import { createNotification } from "../services/notificationService";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { useSettings } from "../contexts/SettingsContext";
import ConfirmModal from "./ConfirmModal";
import {
  districts,
  upazilas,
  LocationNode,
} from "../data/bangladesh-locations";
import { locationService } from "../services/locationService";
import { CourierFactory } from "../lib/courierAdapters";

interface NewOrderProps {
  initialOrder?: any;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function NewOrder({
  initialOrder,
  onClose,
  onSuccess,
}: NewOrderProps = {}) {
  const navigate = useNavigate();
  const { currencySymbol } = useSettings();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [orderForm, setOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    customerCity: "Dhaka",
    customerZone: "Inside Dhaka",
    customShipmentNumber: "",
    isExchange: false,
    division: "",
    district: "",
    area: "",
    landmark: "",
    subtotal: 0,
    deliveryCharge: 80,
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
    advanceAmount: 0,
    source: "Facebook",
    paymentMethod: "COD",
    status: "pending",
    items: [] as any[],
    warehouseId: "",
    notes: "",
    tags: "",
    courierId: "",
    courierName: "",
    trackingNumber: "",
    pathao_city_id: "",
    pathao_zone_id: "",
    pathao_area_id: "",
    carrybee_city_id: "",
    carrybee_zone_id: "",
    carrybee_area_id: "",
  });

  const [cities, setCities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [courierConfigs, setCourierConfigs] = useState<Record<string, any>>({});

  const [sendSMS, setSendSMS] = useState(false);
  const [courierHistory, setCourierHistory] = useState<any>(null);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  useEffect(() => {
    if (initialOrder) {
      setOrderForm({
        ...initialOrder,
        items: initialOrder.items || [],
      });
    }
  }, [initialOrder]);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [newItem, setNewItem] = useState({
    productId: "",
    variantId: "",
    quantity: 1,
    price: 0,
    image: "",
  });

  const statuses = [
    "urgent",
    "hold",
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "partial_delivered",
    "cancelled",
    "returned",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsSnap = await getDocs(collection(db, "products"));
        setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const variantsSnap = await getDocs(collection(db, "variants"));
        setVariants(variantsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const warehousesSnap = await getDocs(collection(db, "warehouses"));
        const warehousesList = warehousesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setWarehouses(warehousesList);

        if (warehousesList.length === 1) {
          setOrderForm((prev) => ({
            ...prev,
            warehouseId: warehousesList[0].id,
          }));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await fetch("/api/couriers/configs");
        if (response.ok) {
          const data = await (response.headers
            .get("content-type")
            ?.includes("json")
            ? response.json()
            : Promise.reject(
                new Error("Invalid non-JSON response from server."),
              ));
          setCourierConfigs(data);
        }
      } catch (error) {
        console.error("Error fetching courier configs:", error);
      }
    };
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (courierConfigs.pathao?.isActive) {
      fetchCities();
    }
  }, [courierConfigs.pathao?.isActive]);

  const fetchCities = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch("/api/couriers/cities/pathao");
      if (response.ok) {
        const data = await (response.headers
          .get("content-type")
          ?.includes("json")
          ? response.json()
          : Promise.reject(
              new Error("Invalid non-JSON response from server."),
            ));
        setCities(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleAddressChange = (address: string) => {
    setOrderForm((prev) => ({ ...prev, customerAddress: address }));

    // Smart Parsing
    const parsed = locationService.parseAddress(address);
    if (parsed.district || parsed.upazila || parsed.area) {
      const district = parsed.district?.nameEn || orderForm.district;
      const division = parsed.division?.nameEn || orderForm.division;
      const parsedAreaStr = parsed.area?.nameEn || parsed.upazila?.nameEn;
      const charge = locationService.getDeliveryCharge(district, division);
      const zone = locationService.getDeliveryZone(district);

      setOrderForm((prev) => ({
        ...prev,
        district,
        area: parsedAreaStr || prev.area,
        division,
        deliveryCharge: charge,
        customerZone: zone,
      }));

      // Auto-fetch Pathao IDs if Pathao is active
      if (courierConfigs.pathao?.isActive) {
        autoMatchPathao(district, parsedAreaStr || orderForm.area);
      }
    }
  };

  const autoMatchPathao = async (districtName: string, areaName: string) => {
    if (!courierConfigs.pathao || !districtName) return;
    try {
      const citiesRes = await fetch("/api/couriers/cities/pathao");
      if (!citiesRes.ok) {
        const errData = await (citiesRes.headers
          .get("content-type")
          ?.includes("json")
          ? citiesRes.json()
          : Promise.reject(new Error("Invalid non-JSON response.")));
        throw new Error(errData.error || "Failed to fetch Pathao cities");
      }
      const pathaoCities = await (citiesRes.headers
        .get("content-type")
        ?.includes("json")
        ? citiesRes.json()
        : Promise.reject(new Error("Invalid non-JSON response.")));

      const city = locationService.matchCourierLocation(
        districtName,
        pathaoCities.data || [],
        "city_name",
      );

      if (city) {
        setOrderForm((prev) => ({
          ...prev,
          pathao_city_id: city.city_id.toString(),
        }));

        const zonesRes = await fetch(
          `/api/couriers/zones/pathao/${city.city_id}`,
        );
        if (!zonesRes.ok) {
          const errData = await (zonesRes.headers
            .get("content-type")
            ?.includes("json")
            ? zonesRes.json()
            : Promise.reject(new Error("Invalid non-JSON response.")));
          throw new Error(errData.error || "Failed to fetch Pathao zones");
        }
        const pathaoZones = await (zonesRes.headers
          .get("content-type")
          ?.includes("json")
          ? zonesRes.json()
          : Promise.reject(new Error("Invalid non-JSON response.")));

        const zone = locationService.matchCourierLocation(
          areaName,
          pathaoZones.data || [],
          "zone_name",
        );

        if (zone) {
          setOrderForm((prev) => ({
            ...prev,
            pathao_zone_id: zone.zone_id.toString(),
          }));

          const areasRes = await fetch(
            `/api/couriers/areas/pathao/${zone.zone_id}`,
          );
          if (!areasRes.ok) {
            const errData = await (areasRes.headers
              .get("content-type")
              ?.includes("json")
              ? areasRes.json()
              : Promise.reject(new Error("Invalid non-JSON response.")));
            throw new Error(errData.error || "Failed to fetch Pathao areas");
          }
          const pathaoAreas = await (areasRes.headers
            .get("content-type")
            ?.includes("json")
            ? areasRes.json()
            : Promise.reject(new Error("Invalid non-JSON response.")));

          const area =
            locationService.matchCourierLocation(
              areaName,
              pathaoAreas.data || [],
              "area_name",
            ) || pathaoAreas.data?.[0];

          if (area) {
            setOrderForm((prev) => ({
              ...prev,
              pathao_area_id: area.area_id.toString(),
            }));
          }
        }
      }
    } catch (error: any) {
      console.error("Error auto-matching Pathao locations:", error.message);
    }
  };

  const fetchZones = async (cityId: string) => {
    setLoadingLocations(true);
    setZones([]);
    setAreas([]);
    try {
      const response = await fetch(`/api/couriers/zones/pathao/${cityId}`);
      if (response.ok) {
        const data = await (response.headers
          .get("content-type")
          ?.includes("json")
          ? response.json()
          : Promise.reject(
              new Error("Invalid non-JSON response from server."),
            ));
        setZones(data.data || []);
      } else {
        const errData = await (response.headers
          .get("content-type")
          ?.includes("json")
          ? response.json()
          : Promise.reject(
              new Error("Invalid non-JSON response from server."),
            ));
        console.error("Error fetching Pathao zones:", errData.error);
      }
    } catch (error: any) {
      console.error("Error fetching Pathao zones:", error.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchAreas = async (zoneId: string) => {
    setLoadingLocations(true);
    setAreas([]);
    try {
      const response = await fetch(`/api/couriers/areas/pathao/${zoneId}`);
      if (response.ok) {
        const data = await (response.headers
          .get("content-type")
          ?.includes("json")
          ? response.json()
          : Promise.reject(
              new Error("Invalid non-JSON response from server."),
            ));
        setAreas(data.data || []);
      } else {
        const errData = await (response.headers
          .get("content-type")
          ?.includes("json")
          ? response.json()
          : Promise.reject(
              new Error("Invalid non-JSON response from server."),
            ));
        console.error("Error fetching Pathao areas:", errData.error);
      }
    } catch (error: any) {
      console.error("Error fetching Pathao areas:", error.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleZoneChange = (zone: string) => {
    let charge = 80;
    if (zone === "Outside Dhaka") charge = 150;
    if (zone === "Sub Area") charge = 130;
    setOrderForm({ ...orderForm, customerZone: zone, deliveryCharge: charge });
  };

  const handlePhoneChange = async (phone: string) => {
    const bengaliToEnglish: { [key: string]: string } = {
      "০": "0",
      "১": "1",
      "২": "2",
      "৩": "3",
      "৪": "4",
      "৫": "5",
      "৬": "6",
      "৭": "7",
      "৮": "8",
      "৯": "9",
    };
    const engPhone = phone.replace(
      /[০-৯]/g,
      (match) => bengaliToEnglish[match],
    );

    setOrderForm((prev) => ({ ...prev, customerPhone: engPhone }));
    if (engPhone.length >= 11) {
      // Fetch local customer data
      try {
        const q = query(
          collection(db, "customers"),
          where("phone", "==", engPhone),
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const customerData = querySnapshot.docs[0].data();
          setOrderForm((prev) => ({
            ...prev,
            customerName: customerData.name || prev.customerName,
            customerAddress: customerData.address || prev.customerAddress,
            district: customerData.district || prev.district,
            area: customerData.area || prev.area,
            landmark: customerData.landmark || prev.landmark,
            customerCity: customerData.city || prev.customerCity,
            customerZone: customerData.zone || prev.customerZone,
          }));
          toast.success(`Found existing customer: ${customerData.name}`);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }

      // Fetch courier history
      fetchCourierHistory(engPhone);
    } else {
      setCourierHistory(null);
    }
  };

  const fetchCourierHistory = async (phone: string) => {
    setIsFetchingHistory(true);
    try {
      const response = await fetch(`/api/couriers/check-fraud/${phone}`);
      const result = await (response.headers
        .get("content-type")
        ?.includes("json")
        ? response.json()
        : Promise.reject(new Error("Invalid non-JSON response from server.")));

      if (response.ok) {
        if (result.data) {
          setCourierHistory({
            courier: result.courier,
            ...result.data,
          });
          if (result.data.error) {
            toast.error(`Courier Check Warning: ${result.data.error}`);
          }
        }
      } else {
        console.error("Courier response error:", result.error);
        if (result.error !== "No active courier supports fraud check") {
          toast.error(`Courier Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error fetching courier history:", error);
      toast.error("Network error while checking courier history");
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const [activeProductFilter, setActiveProductFilter] = useState<
    "all" | "recent" | "best_selling" | "frequent"
  >("all");

  const calculateTotals = (
    items: any[],
    deliveryCharge: number,
    discount: number,
    paidAmount: number,
  ) => {
    const subtotal = items.reduce(
      (acc, item) => acc + item.quantity * item.price,
      0,
    );
    const totalAmount = subtotal + deliveryCharge - discount;
    const dueAmount = totalAmount - paidAmount;
    return { subtotal, totalAmount, dueAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    // Filter out zero-quantity items
    const validItems = orderForm.items.filter((item) => item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one item with a valid quantity.");
      return;
    }
    if (orderForm.customerPhone.trim().length !== 11) {
      toast.error("Phone number must be exactly 11 digits.");
      return;
    }
    if (!orderForm.warehouseId) {
      toast.error("Please select a warehouse.");
      return;
    }

    setLoading(true);
    try {
      const { subtotal, totalAmount, dueAmount } = calculateTotals(
        validItems,
        orderForm.deliveryCharge,
        orderForm.discount,
        orderForm.paidAmount,
      );

      if (!initialOrder) {
        const duplicate = await checkDuplicateOrder({
          customerPhone: orderForm.customerPhone,
          customerName: orderForm.customerName,
          items: validItems,
          totalAmount: totalAmount,
        });

        if (duplicate) {
          setConfirmConfig({
            isOpen: true,
            title: "Duplicate Order Detected!",
            message: `An order (#${duplicate.orderNumber || duplicate.id.slice(0, 8)}) with the same phone number, products, and total value was found within the last 24 hours.\n\nAre you sure you want to create this duplicate order?`,
            variant: "warning",
            onConfirm: () =>
              proceedWithSubmit(subtotal, totalAmount, dueAmount),
          });
          setLoading(false);
          return;
        }
      }

      await proceedWithSubmit(subtotal, totalAmount, dueAmount);
    } catch (error) {
      handleFirestoreError(
        error,
        initialOrder ? OperationType.UPDATE : OperationType.CREATE,
        "orders",
      );
      setLoading(false);
    }
  };

  const proceedWithSubmit = async (
    subtotal: number,
    totalAmount: number,
    dueAmount: number,
  ) => {
    setLoading(true);
    const validItems = orderForm.items.filter((item) => item.quantity > 0);
    try {
      const logEntry = {
        user: auth.currentUser?.email,
        action: initialOrder ? "Updated Order" : "Created Order",
        timestamp: Timestamp.now(),
        details: initialOrder
          ? `Updated order #${initialOrder.orderNumber}`
          : "Initial creation",
      };

      const data = {
        ...orderForm,
        items: validItems,
        subtotal,
        totalAmount,
        dueAmount,
        logs: initialOrder
          ? [...(initialOrder.logs || []), logEntry]
          : [logEntry],
        updatedAt: serverTimestamp(),
      };

      // 1. PRE-TRANSACTION READS
      const customerQuery = query(
        collection(db, "customers"),
        where("phone", "==", orderForm.customerPhone),
      );
      const customerSnap = await getDocs(customerQuery);

      const inventorySnaps: { item: any; snap: any }[] = [];
      if (!initialOrder) {
        for (const item of validItems) {
          const invQuery = query(
            collection(db, "inventory"),
            where("productId", "==", item.productId || ""),
            where("variantId", "==", item.variantId || ""),
            where("warehouseId", "==", orderForm.warehouseId || ""),
          );
          const invSnap = await getDocs(invQuery);
          inventorySnaps.push({ item, snap: invSnap });
        }
      }

      let accountId = "";
      if (data.paidAmount > 0) {
        const accountsQuery = query(
          collection(db, "accounts"),
          where("name", "==", data.paymentMethod),
        );
        const accountsSnap = await getDocs(accountsQuery);
        if (!accountsSnap.empty) {
          accountId = accountsSnap.docs[0].id;
        } else {
          const allAccountsSnap = await getDocs(
            query(collection(db, "accounts"), limit(1)),
          );
          if (!allAccountsSnap.empty) {
            accountId = allAccountsSnap.docs[0].id;
          }
        }
      }

      const createdOrderNumber = await runTransaction(
        db,
        async (transaction) => {
          // 2. TRANSACTION READS
          const settingsRef = doc(db, "settings", "company");
          const settingsSnap = await transaction.get(settingsRef);

          let accountSnap = null;
          let accountRef = null;
          if (accountId) {
            accountRef = doc(db, "accounts", accountId);
            accountSnap = await transaction.get(accountRef);
          }

          const rewardPointsRate = settingsSnap.exists()
            ? settingsSnap.data().rewardPointsRate || 0
            : 0;
          const pointsEarned = Math.floor(totalAmount / 100) * rewardPointsRate;

          // 3. ALL WRITES SECOND
          let customerId = "";
          if (customerSnap.empty) {
            const customerRef = doc(collection(db, "customers"));
            transaction.set(customerRef, {
              name: orderForm.customerName,
              phone: orderForm.customerPhone,
              address: orderForm.customerAddress,
              orderCount: 1,
              totalSpent: totalAmount,
              points: pointsEarned,
              lastOrderDate: serverTimestamp(),
              uid: auth.currentUser!.uid,
              createdAt: serverTimestamp(),
            });
            customerId = customerRef.id;
          } else {
            const customerDoc = customerSnap.docs[0];
            customerId = customerDoc.id;
            transaction.update(customerDoc.ref, {
              orderCount:
                (customerDoc.data().orderCount || 0) + (initialOrder ? 0 : 1),
              totalSpent:
                (customerDoc.data().totalSpent || 0) +
                (initialOrder ? 0 : totalAmount),
              points:
                (customerDoc.data().points || 0) +
                (initialOrder ? 0 : pointsEarned),
              lastOrderDate: serverTimestamp(),
            });
          }

          if (initialOrder) {
            transaction.update(doc(db, "orders", initialOrder.id), {
              ...data,
              customerId,
            });
            return initialOrder.orderNumber;
          }

          let nextOrderNumber = 1001;
          if (settingsSnap.exists() && settingsSnap.data().orderCounter) {
            nextOrderNumber = settingsSnap.data().orderCounter + 1;
          }
          transaction.set(
            settingsRef,
            { orderCounter: nextOrderNumber },
            { merge: true },
          );

          const orderRef = doc(collection(db, "orders"));
          transaction.set(orderRef, {
            ...data,
            customerId,
            orderNumber: nextOrderNumber,
            uid: auth.currentUser!.uid,
            createdAt: serverTimestamp(),
          });

          // Add to Finance if paidAmount > 0
          if (data.paidAmount > 0) {
            const transactionRef = doc(collection(db, "transactions"));
            transaction.set(transactionRef, {
              type: "income",
              category: "Sales",
              amount: data.paidAmount,
              description: `Order #${nextOrderNumber} Payment`,
              date: serverTimestamp(),
              method: data.paymentMethod,
              accountId: accountId,
              orderId: orderRef.id,
              orderNumber: nextOrderNumber,
              uid: auth.currentUser?.uid,
              createdAt: serverTimestamp(),
            });

            if (accountRef && accountSnap && accountSnap.exists()) {
              const currentBalance = accountSnap.data().balance || 0;
              transaction.update(accountRef, {
                balance: currentBalance + data.paidAmount,
                updatedAt: serverTimestamp(),
              });
            }
          }

          // Send SMS if enabled
          if (sendSMS) {
            sendOrderConfirmationSMS({
              ...data,
              orderNumber: nextOrderNumber,
              customerName: orderForm.customerName,
              customerPhone: orderForm.customerPhone,
            });
          }

          // Deduct Inventory
          for (const invData of inventorySnaps) {
            const { item, snap } = invData;
            if (!snap.empty) {
              const invDoc = snap.docs[0];
              const currentQty = invDoc.data().quantity;
              const newQty = currentQty - item.quantity;
              transaction.update(invDoc.ref, {
                quantity: newQty,
                updatedAt: serverTimestamp(),
              });

              const logRef = doc(collection(db, "inventoryLogs"));
              transaction.set(logRef, {
                productId: item.productId,
                variantId: item.variantId || "",
                warehouseId: orderForm.warehouseId,
                type: "out",
                quantityChange: -item.quantity,
                newQuantity: newQty,
                reason: `Order #${nextOrderNumber}`,
                uid: auth.currentUser!.uid,
                createdAt: serverTimestamp(),
              });
            }
          }

          return nextOrderNumber;
        },
      );

      if (initialOrder) {
        await logActivity(
          "Updated Order",
          "Orders",
          `Updated Order #${createdOrderNumber} for ${orderForm.customerName}`,
        );

        toast.success(`Order #${createdOrderNumber} updated successfully!`, {
          duration: 5000,
          position: "top-center",
        });

        if (onSuccess) onSuccess();
        return;
      }

      await logActivity(
        "Created Order",
        "Orders",
        `New Order for ${orderForm.customerName}`,
      );

      await createNotification({
        title: "New Order",
        message: `A new order has been created for ${orderForm.customerName}.`,
        type: "order",
        link: "/orders",
        forRole: "admin",
      });

      toast.success(`Order #${createdOrderNumber} created successfully!`, {
        duration: 5000,
        position: "top-center",
      });

      // Reset form instead of navigating
      setOrderForm({
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        customerCity: "Dhaka",
        customerZone: "Inside Dhaka",
        customShipmentNumber: "",
        isExchange: false,
        division: "",
        district: "",
        area: "",
        landmark: "",
        subtotal: 0,
        deliveryCharge: 80,
        discount: 0,
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        advanceAmount: 0,
        source: "Facebook",
        paymentMethod: "COD",
        status: "pending",
        items: [] as any[],
        warehouseId: orderForm.warehouseId, // Keep same warehouse across prints
        notes: "",
        tags: "",
        courierId: "",
        courierName: "",
        trackingNumber: "",
        pathao_city_id: "",
        pathao_zone_id: "",
        pathao_area_id: "",
        carrybee_city_id: "",
        carrybee_zone_id: "",
        carrybee_area_id: "",
      });
      setCourierHistory(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "orders");
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, totalAmount, dueAmount } = calculateTotals(
    orderForm.items,
    orderForm.deliveryCharge,
    orderForm.discount,
    orderForm.paidAmount,
  );

  const totalCost = orderForm.items.reduce((sum, item) => {
    const p = products.find((prod) => prod.id === item.productId);
    return sum + (p?.costPrice || 0) * item.quantity;
  }, 0);
  const profit = subtotal - orderForm.discount - totalCost;
  const marginPercentage =
    subtotal - orderForm.discount > 0
      ? ((profit / (subtotal - orderForm.discount)) * 100).toFixed(1)
      : 0;

  let filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase()),
  );

  if (!productSearch) {
    if (activeProductFilter === "recent") {
      filteredProducts = [...products]
        .sort(
          (a: any, b: any) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
        )
        .slice(0, 10);
    } else if (activeProductFilter === "best_selling") {
      filteredProducts = [...products]
        .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
        .slice(0, 10);
    } else if (activeProductFilter === "frequent") {
      filteredProducts = [...products]
        .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
        .slice(0, 10);
    }
  }

  return (
    <div
      className={`space-y-6 sm:space-y-8 max-w-6xl mx-auto ${onClose ? "pt-2 pb-6" : "pb-20 lg:pb-8"}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (onClose ? onClose() : navigate("/orders"))}
            className="p-2 hover:bg-surface-hover text-secondary rounded-xl transition-all shrink-0"
          >
            {onClose ? <X size={20} /> : <ArrowLeft size={20} />}
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
              {initialOrder
                ? `Edit Order #${initialOrder.orderNumber || initialOrder.id?.slice(0, 8)}`
                : "Create Order"}
            </h2>
            <p className="text-sm font-medium text-secondary mt-1">
              {initialOrder
                ? "Update details for this order."
                : "Create a new order by adding customer and products."}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {!initialOrder && (
            <button
              type="button"
              className="px-4 py-2 bg-surface border border-border text-primary rounded-lg text-sm font-semibold hover:bg-surface-hover transition-all shadow-subtle flex items-center gap-2"
            >
              <Save size={16} /> <span>Save Draft</span>
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition-all shadow-subtle disabled:opacity-50"
          >
            {loading ? (
              initialOrder ? (
                "Updating..."
              ) : (
                "Saving..."
              )
            ) : (
              <>
                <ShoppingBag size={16} />{" "}
                {initialOrder ? "Update Order" : "Place Order"}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Section */}
          <div className="bg-surface rounded-xl border border-border p-6 shadow-subtle space-y-6">
            <h4 className="text-base font-bold text-primary flex items-center gap-2 mb-6">
              <UserCheck size={20} className="text-brand" /> Customer
              Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {/* Row 1: Phone */}
              <div className="space-y-2">
                <label className="mb-2 block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      required
                      className={`w-full pl-11 ${orderForm.customerPhone.length >= 11 ? "pr-11 border-emerald-500 focus:border-emerald-500 ring-emerald-500/20" : "pr-4 border-border focus:border-brand focus:ring-brand/20"} py-2.5 bg-surface text-sm rounded-lg outline-none transition-all border`}
                      value={orderForm.customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="01XXX-XXXXXX"
                    />
                    <Phone
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                    />
                    {orderForm.customerPhone.length >= 11 && (
                      <CheckCircle
                        size={18}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"
                      />
                    )}
                  </div>
                  {orderForm.customerPhone.length >= 11 && (
                    <a
                      href={`https://wa.me/88${orderForm.customerPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-all shadow-premium flex items-center justify-center shrink-0"
                      title="Chat on WhatsApp"
                    >
                      <Smartphone size={20} />
                    </a>
                  )}
                </div>
              </div>

              {/* Row 1: Existing Customer History */}
              <div className="flex items-end min-h-[76px] sm:min-h-0 sm:pt-6">
                <div className="w-full">
                  {isFetchingHistory ? (
                    <div className="flex items-center gap-2 px-4 py-3 bg-surface-hover rounded-xl">
                      <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-brand">
                        Checking customer history...
                      </span>
                    </div>
                  ) : courierHistory ? (
                    <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            Existing Customer Found
                          </p>
                          <p className="text-[10px] sm:text-xs text-emerald-600 mt-0.5">
                            {courierHistory.total_delivered} Delivered •{" "}
                            {courierHistory.total_cancelled} Cancelled •
                            Success: {courierHistory.success_rate || "100%"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            courierHistory.customer_name ||
                            courierHistory.customer_address ||
                            courierHistory.address
                          ) {
                            setOrderForm((prev) => ({
                              ...prev,
                              customerName:
                                courierHistory.customer_name ||
                                prev.customerName,
                              customerAddress:
                                courierHistory.address ||
                                courierHistory.customer_address ||
                                prev.customerAddress,
                            }));
                            toast.success("Autofilled from courier network");
                          } else {
                            toast.error(
                              "No names/addresses found in courier network",
                            );
                          }
                        }}
                        className="px-3 py-1.5 bg-surface text-brand text-[11px] font-bold rounded-lg border border-blue-200 shadow-subtle hover:bg-surface-hover transition-colors active:scale-95 whitespace-nowrap"
                      >
                        Autofill Data
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Row 2: Name */}
              <div className="space-y-2">
                <label className="mb-2 block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Customer Name *
                </label>
                <div className="relative">
                  <input
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary"
                    value={orderForm.customerName}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        customerName: e.target.value,
                      })
                    }
                    placeholder="Enter full name"
                  />
                  <User
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                  />
                </div>
              </div>

              {/* Row 2: Full Address */}
              <div className="space-y-2 relative">
                <label className="mb-2 block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Full Address *
                </label>
                <textarea
                  required
                  className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all resize-none text-primary"
                  rows={2}
                  placeholder="House 10, Dhanmondi, Dhaka"
                  value={orderForm.customerAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onBlur={() => {
                    const parsed = locationService.parseAddress(
                      orderForm.customerAddress,
                    );
                    if (parsed.district || parsed.upazila || parsed.area) {
                      const district =
                        parsed.district?.nameEn || orderForm.district;
                      const division =
                        parsed.division?.nameEn || orderForm.division;
                      const parsedAreaStr =
                        parsed.area?.nameEn || parsed.upazila?.nameEn;
                      const charge = locationService.getDeliveryCharge(
                        district,
                        division,
                      );
                      const zone = locationService.getDeliveryZone(district);
                      setOrderForm((prev) => ({
                        ...prev,
                        district,
                        area: parsedAreaStr || prev.area,
                        division,
                        deliveryCharge: charge,
                        customerZone: zone,
                      }));
                      if (courierConfigs.pathao?.isActive) {
                        autoMatchPathao(
                          district,
                          parsedAreaStr || orderForm.area,
                        );
                      }
                    }
                  }}
                />
              </div>

              {/* Row 3: District */}
              <div className="space-y-2">
                <label className="mb-2 block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  District
                </label>
                <div className="relative">
                  <select
                    className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary appearance-none cursor-pointer"
                    value={orderForm.district}
                    onChange={(e) => {
                      const newDistrict = e.target.value;
                      const charge = locationService.getDeliveryCharge(
                        newDistrict,
                        orderForm.division,
                      );
                      const zone = locationService.getDeliveryZone(newDistrict);
                      setOrderForm({
                        ...orderForm,
                        district: newDistrict,
                        area: "",
                        deliveryCharge: charge,
                        customerZone: zone,
                      });
                      if (courierConfigs.pathao?.isActive)
                        autoMatchPathao(newDistrict, "");
                    }}
                  >
                    <option value="">Select District</option>
                    {[...districts]
                      .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
                      .map((d) => (
                        <option key={d.id} value={d.nameEn}>
                          {d.nameEn}
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <ChevronDown size={16} strokeWidth={3} />
                  </div>
                </div>
              </div>

              {/* Row 3: Area */}
              <div className="space-y-2">
                <label className="mb-2 block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Area
                </label>
                <div className="relative">
                  <select
                    className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary appearance-none cursor-pointer disabled:opacity-50 disabled:bg-surface-hover"
                    value={orderForm.area}
                    onChange={(e) => {
                      setOrderForm({ ...orderForm, area: e.target.value });
                      if (courierConfigs.pathao?.isActive)
                        autoMatchPathao(orderForm.district, e.target.value);
                    }}
                    disabled={!orderForm.district}
                  >
                    <option value="">Select Area</option>
                    {upazilas
                      .filter(
                        (u) =>
                          orderForm.district &&
                          districts.find((d) => d.nameEn === orderForm.district)
                            ?.id === u.districtId,
                      )
                      .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
                      .map((u) => (
                        <option key={u.id} value={u.nameEn}>
                          {u.nameEn}
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <ChevronDown size={16} strokeWidth={3} />
                  </div>
                </div>
              </div>

              {/* Row 4: Custom Shipment Number, Exchange & Notes */}
              <div className="flex flex-col justify-end space-y-2">
                <div className="flex items-center justify-between mb-2 h-[20px]">
                  <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    Shipment Number
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={orderForm.isExchange}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          isExchange: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-border text-brand focus:ring-brand"
                    />
                    <span className="text-[11px] font-bold text-brand uppercase tracking-wider flex items-center pt-0.5">
                      Exchange
                    </span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-4 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary"
                    value={orderForm.customShipmentNumber}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        customShipmentNumber: e.target.value,
                      })
                    }
                    placeholder="Enter Shipment Number"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <div className="flex items-center mb-2 h-[20px]">
                  <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    Notes
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full pl-4 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary"
                    value={orderForm.notes}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, notes: e.target.value })
                    }
                    placeholder="Write notes here..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Add Products Section */}
          <div className="bg-surface rounded-xl border border-border p-6 shadow-subtle space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h4 className="text-base font-bold text-primary flex items-center gap-2 mb-2 sm:mb-0">
                <Package size={20} className="text-brand" /> Add Products
              </h4>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-xs font-semibold focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary appearance-none cursor-pointer"
                    value={orderForm.warehouseId}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        warehouseId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <ChevronDown size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div ref={dropdownRef} className="relative z-20">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors">
                    <Search size={18} strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by product name, SKU or scan barcode..."
                    className="w-full pl-12 pr-[140px] py-3 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary placeholder:text-muted"
                    value={productSearch}
                    onFocus={() => setShowProductDropdown(true)}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setActiveProductFilter("all");
                      setShowProductDropdown(true);
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted bg-surface-hover px-2 py-1 rounded hidden sm:block border border-border">
                      Ctrl + K
                    </span>
                    <button
                      type="button"
                      className="p-2 sm:px-3 sm:py-1.5 bg-surface border border-border text-brand rounded-lg hover:bg-surface-hover transition-colors flex items-center gap-1.5 shadow-subtle"
                    >
                      <ScanBarcode size={16} />{" "}
                      <span className="text-xs font-bold hidden sm:block">
                        Scan
                      </span>
                    </button>
                  </div>
                </div>

                {showProductDropdown &&
                  (productSearch || activeProductFilter !== "all") && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto overflow-hidden">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors border-b border-border last:border-0 text-left group/item"
                            onClick={() => {
                              setNewItem({
                                ...newItem,
                                productId: p.id,
                                variantId: "",
                                price: p.price || 0,
                                image: p.images?.[0] || p.image || "",
                              });
                              setProductSearch(p.name);
                              setShowProductDropdown(false);
                            }}
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                              {p.images?.[0] || p.image ? (
                                <img
                                  src={p.images?.[0] || p.image}
                                  alt=""
                                  className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full bg-surface-hover flex items-center justify-center text-muted">
                                  <Package size={20} strokeWidth={1.5} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-primary truncate group-hover/item:text-brand transition-colors">
                                {p.name}
                              </p>
                              <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                                {currencySymbol}
                                {p.price?.toLocaleString()}{" "}
                                <span className="text-muted mx-1">•</span>{" "}
                                <span className="font-normal">
                                  SKU: {p.sku || "N/A"}
                                </span>
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-[11px] font-bold uppercase tracking-wider text-muted">
                          No matching products found
                        </div>
                      )}
                    </div>
                  )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProductFilter("recent");
                    setShowProductDropdown(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${activeProductFilter === "recent" && showProductDropdown ? "bg-brand/10 text-brand-hover border-blue-200" : "bg-surface text-secondary border-border hover:bg-surface-hover"}`}
                >
                  <Package size={14} /> Recent Products
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProductFilter("best_selling");
                    setShowProductDropdown(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${activeProductFilter === "best_selling" && showProductDropdown ? "bg-brand/10 text-brand-hover border-blue-200" : "bg-surface text-secondary border-border hover:bg-surface-hover"}`}
                >
                  <ShoppingCart size={14} /> Best Selling
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProductFilter("frequent");
                    setShowProductDropdown(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${activeProductFilter === "frequent" && showProductDropdown ? "bg-brand/10 text-brand-hover border-blue-200" : "bg-surface text-secondary border-border hover:bg-surface-hover"}`}
                >
                  <ListFilter size={14} /> Frequently Bought
                </button>
              </div>

              {newItem.productId && (
                <div className="bg-surface-hover p-4 rounded-xl border border-border mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Variant Select */}
                    <div className="md:col-span-5 space-y-2">
                      <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                        Select Variant
                      </label>
                      <div className="relative">
                        <select
                          disabled={
                            !newItem.productId ||
                            products.find((p) => p.id === newItem.productId)
                              ?.type !== "variable"
                          }
                          className="w-full pl-4 pr-10 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary appearance-none cursor-pointer disabled:opacity-50 disabled:bg-surface-hover"
                          value={newItem.variantId}
                          onChange={(e) => {
                            const v = variants.find(
                              (varnt) => varnt.id === e.target.value,
                            );
                            setNewItem({
                              ...newItem,
                              variantId: e.target.value,
                              price: v?.price || newItem.price,
                            });
                          }}
                        >
                          <option value="">DEFAULT VARIANT</option>
                          {newItem.productId &&
                            variants
                              .filter((v) => v.productId === newItem.productId)
                              .map((v) => (
                                <option key={v.id} value={v.id}>
                                  {Object.entries(v)
                                    .filter(
                                      ([key]) =>
                                        ![
                                          "id",
                                          "productId",
                                          "uid",
                                          "createdAt",
                                          "updatedAt",
                                          "sku",
                                          "barcode",
                                          "price",
                                          "costPrice",
                                          "bundleItems",
                                        ].includes(key),
                                    )
                                    .map(([, val]) => val)
                                    .filter(Boolean)
                                    .join("/")}{" "}
                                  - {currencySymbol}
                                  {v.price}
                                </option>
                              ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                          <ChevronDown size={14} strokeWidth={3} />
                        </div>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                        Quantity
                      </label>
                      <div className="flex items-center h-[42px] bg-surface border border-border rounded-lg overflow-hidden shadow-subtle group focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/20 transition-all">
                        <button
                          type="button"
                          onClick={() =>
                            setNewItem((prev) => ({
                              ...prev,
                              quantity: Math.max(1, prev.quantity - 1),
                            }))
                          }
                          className="h-full px-4 hover:bg-surface-hover text-secondary hover:text-primary transition-colors active:bg-surface-hover"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <input
                          type="number"
                          className="w-full text-center h-full text-sm font-bold bg-transparent outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-primary"
                          value={newItem.quantity === 0 ? "" : newItem.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setNewItem({
                              ...newItem,
                              quantity: isNaN(val) ? 0 : val,
                            });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewItem((prev) => ({
                              ...prev,
                              quantity: prev.quantity + 1,
                            }))
                          }
                          className="h-full px-4 hover:bg-surface-hover text-secondary hover:text-primary transition-colors active:bg-surface-hover"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                    {/* Add Button */}
                    <div className="md:col-span-3 flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newItem.productId) {
                            toast.error("Please select a product");
                            return;
                          }
                          const p = products.find(
                            (prod) => prod.id === newItem.productId,
                          );
                          const v = variants.find(
                            (varnt) => varnt.id === newItem.variantId,
                          );
                          const itemWithInfo = {
                            ...newItem,
                            name: p?.name || "Unknown Product",
                            variant: v
                              ? Object.entries(v)
                                  .filter(
                                    ([key]) =>
                                      ![
                                        "id",
                                        "productId",
                                        "uid",
                                        "createdAt",
                                        "updatedAt",
                                        "sku",
                                        "barcode",
                                        "price",
                                        "costPrice",
                                        "bundleItems",
                                      ].includes(key),
                                  )
                                  .map(([, val]) => val)
                                  .filter(Boolean)
                                  .join("/")
                              : "",
                            image: p?.image || "",
                          };
                          setOrderForm({
                            ...orderForm,
                            items: [...orderForm.items, itemWithInfo],
                          });
                          setNewItem({
                            productId: "",
                            variantId: "",
                            quantity: 1,
                            price: 0,
                            image: "",
                          });
                          setProductSearch("");
                        }}
                        className="w-full h-[42px] bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand-hover transition-all shadow-subtle active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Items Section */}
          <div className="bg-surface rounded-xl border border-border p-6 shadow-subtle space-y-6">
            <h4 className="text-base font-bold text-primary flex items-center gap-2 mb-4">
              <ShoppingCart size={20} className="text-brand" /> Order Items (
              {orderForm.items.length})
            </h4>

            {orderForm.items.length > 0 && (
              <div className="hidden sm:grid grid-cols-12 gap-4 pb-2 border-b border-border text-[11px] font-semibold text-secondary uppercase tracking-wider">
                <div className="col-span-4">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-3 text-center">Quantity</div>
                <div className="col-span-3 text-right">Total</div>
              </div>
            )}

            <div className="space-y-3">
              {orderForm.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center bg-surface border border-border p-4 rounded-xl hover:border-blue-300 transition-all group/item shadow-subtle"
                >
                  <div className="col-span-4 w-full flex items-center gap-4">
                    {item.image ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                        <img
                          src={item.image}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center text-muted shrink-0 border border-border">
                        <Package size={20} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-primary truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-medium text-secondary flex items-center gap-1.5 mt-0.5">
                        {item.variant ? (
                          <span>Variant: {item.variant}</span>
                        ) : null}
                        {item.variant && (
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        )}
                        <span>SKU: {item.sku || "N/A"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2 w-full sm:w-auto flex justify-between sm:justify-center items-center font-bold text-primary text-sm">
                    <span className="sm:hidden text-xs text-secondary font-normal">
                      Price:
                    </span>
                    {currencySymbol}
                    {item.price.toLocaleString()}
                  </div>

                  <div className="col-span-3 w-full sm:w-auto flex justify-center items-center">
                    <div className="flex items-center bg-surface rounded-lg overflow-hidden border border-border w-full max-w-[120px] sm:max-w-none">
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...orderForm.items];
                          newItems[idx].quantity = Math.max(
                            1,
                            newItems[idx].quantity - 1,
                          );
                          setOrderForm({ ...orderForm, items: newItems });
                        }}
                        className="px-3 py-1.5 hover:bg-surface-hover text-secondary transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        className="w-full text-center bg-transparent text-sm font-bold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] text-primary"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          const newItems = [...orderForm.items];
                          newItems[idx].quantity = isNaN(val) ? 0 : val;
                          setOrderForm({ ...orderForm, items: newItems });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...orderForm.items];
                          newItems[idx].quantity = newItems[idx].quantity + 1;
                          setOrderForm({ ...orderForm, items: newItems });
                        }}
                        className="px-3 py-1.5 hover:bg-surface-hover text-secondary transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="col-span-3 w-full sm:w-auto flex justify-between sm:justify-end items-center gap-4">
                    <span className="sm:hidden text-xs text-secondary font-normal">
                      Total:
                    </span>
                    <span className="text-sm font-black text-primary">
                      {currencySymbol}
                      {(item.quantity * item.price).toLocaleString()}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        className="p-2 text-muted hover:text-brand rounded-lg transition-colors"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOrderForm({
                            ...orderForm,
                            items: orderForm.items.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-2 text-muted hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {orderForm.items.length === 0 && (
                <div className="text-center py-16 bg-surface-hover rounded-xl border border-dashed border-border">
                  <div className="mx-auto w-12 h-12 bg-surface rounded-lg flex items-center justify-center text-muted border border-border shadow-subtle mb-4">
                    <Package size={24} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-bold text-primary">
                    No items added yet
                  </p>
                  <p className="text-xs font-medium text-secondary mt-1">
                    Search the catalog above to add products.
                  </p>
                </div>
              )}

              {orderForm.items.length > 0 && (
                <div className="flex items-center justify-between pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setOrderForm({ ...orderForm, items: [] })}
                    className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors bg-surface shadow-subtle"
                  >
                    Clear All
                  </button>
                  <p className="text-sm font-semibold text-secondary">
                    Total Items: {orderForm.items.length}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Summary Section */}
          <div className="bg-surface rounded-xl border border-border p-6 shadow-subtle space-y-6 lg:sticky lg:top-6">
            <h4 className="text-base font-bold text-primary flex items-center gap-2 mb-6">
              <CreditCard size={20} className="text-brand" /> Order Summary
            </h4>

            <div className="space-y-4">
              <div className="flex justify-between text-sm text-primary">
                <span className="text-secondary">Subtotal</span>
                <span className="font-bold">
                  {currencySymbol}
                  {subtotal.toLocaleString()}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-primary text-sm">
                  <span className="text-secondary">Delivery Zone</span>
                  <div className="relative">
                    <select
                      className="text-sm bg-surface border border-border hover:bg-surface-hover px-2 py-1 rounded-md outline-none text-primary appearance-none cursor-pointer pr-6"
                      value={orderForm.customerZone}
                      onChange={(e) => handleZoneChange(e.target.value)}
                    >
                      <option value="Inside Dhaka">Inside Dhaka</option>
                      <option value="Sub Area">Sub Area</option>
                      <option value="Outside Dhaka">Outside Dhaka</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <ChevronDown size={14} strokeWidth={2} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-primary">
                  <span className="text-secondary">Delivery Charge</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      className="w-24 pl-6 pr-3 py-1.5 text-right font-bold text-primary bg-surface border border-border rounded-lg outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={
                        orderForm.deliveryCharge === 0
                          ? ""
                          : orderForm.deliveryCharge
                      }
                      placeholder="0"
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          deliveryCharge: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-primary border-b border-border pb-4">
                <span className="text-secondary">Discount</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    className="w-24 pl-6 pr-3 py-1.5 text-right font-bold text-red-500 bg-surface border border-border rounded-lg outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    value={orderForm.discount === 0 ? "" : orderForm.discount}
                    placeholder="0"
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        discount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="pt-2 text-primary">
                <div className="flex justify-between items-center">
                  <span className="text-base sm:text-lg font-bold">Total</span>
                  <span className="text-xl sm:text-2xl font-black text-brand">
                    {currencySymbol}
                    {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {totalCost > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 grid grid-cols-2 mt-4">
                  <div>
                    <p className="text-xs text-secondary mb-0.5">Cost Price</p>
                    <p className="font-bold text-primary text-sm">
                      {currencySymbol}
                      {totalCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="border-l border-green-200 pl-3">
                    <p className="text-xs text-secondary mb-0.5">Profit</p>
                    <p className="font-bold text-green-600 text-sm">
                      {currencySymbol}
                      {profit.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-green-600 font-medium">
                      Margin: {marginPercentage}%
                    </p>
                  </div>
                </div>
              )}

              {courierHistory && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 space-y-2 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-amber-600" />
                      COD Protection
                    </span>
                    <span
                      className={`font-bold ${courierHistory.success_rate_numeric >= 80 ? "text-green-600" : "text-amber-700"}`}
                    >
                      {courierHistory.success_rate_numeric >= 80
                        ? "Eligible"
                        : "Warning"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-6">
                    <div
                      className={`w-2 h-2 rounded-full ${courierHistory.success_rate_numeric >= 80 ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
                    <span className="text-xs text-secondary">
                      Risk Level:{" "}
                      <span
                        className={`font-bold ${courierHistory.success_rate_numeric >= 80 ? "text-green-600" : "text-red-600"}`}
                      >
                        {courierHistory.success_rate_numeric >= 80
                          ? "Low"
                          : "High"}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center text-sm text-primary border-b border-border pb-4">
                  <label className="text-secondary">Advance Paid</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      className="w-24 pl-6 pr-3 py-1.5 text-right font-bold text-primary bg-surface border border-border rounded-lg outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={
                        orderForm.paidAmount === 0 ? "" : orderForm.paidAmount
                      }
                      placeholder="0"
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          paidAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-primary">
                  <span className="text-orange-500 font-bold">Due Amount</span>
                  <span className="text-orange-500 font-bold text-xl">
                    {currencySymbol}
                    {dueAmount.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-xs text-secondary block mb-1.5">
                      Payment Method
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                        <Banknote size={16} />
                      </div>
                      <select
                        className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary appearance-none cursor-pointer"
                        value={orderForm.paymentMethod}
                        onChange={(e) =>
                          setOrderForm({
                            ...orderForm,
                            paymentMethod: e.target.value,
                          })
                        }
                      >
                        <option value="COD">Cash on Delivery</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Rocket">Rocket</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                        <ChevronDown size={16} strokeWidth={2} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-secondary block mb-1.5">
                      Order Source
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                        <Facebook size={16} />
                      </div>
                      <select
                        className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-4 focus:ring-brand/20 outline-none transition-all text-primary appearance-none cursor-pointer"
                        value={orderForm.source}
                        onChange={(e) =>
                          setOrderForm({ ...orderForm, source: e.target.value })
                        }
                      >
                        <option value="Facebook">Facebook</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Messenger">Messenger</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Call">Call</option>
                        <option value="Website">Website</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Others">Others</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                        <ChevronDown size={16} strokeWidth={2} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-brand/10/50 rounded-lg border border-brand/20 mt-4">
                    <div className="flex items-center gap-3">
                      <Smartphone size={18} className="text-brand" />
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          Send Confirmation SMS
                        </p>
                        <p className="text-xs text-secondary">
                          Notify customer about this order
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendSMS(!sendSMS)}
                      className={`w-10 h-5 rounded-full transition-all relative ${sendSMS ? "bg-brand" : "bg-slate-300"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-surface rounded-full transition-all ${sendSMS ? "right-0.5" : "left-0.5"}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() =>
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}
