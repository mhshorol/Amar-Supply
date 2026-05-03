export interface LocationNode {
  id: string;
  nameEn: string;
  nameBn: string;
  type: 'division' | 'district' | 'upazila' | 'area';
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
}

export const divisions: LocationNode[] = [
  {
    "id": "div_1",
    "nameEn": "Chattagram",
    "nameBn": "চট্টগ্রাম",
    "type": "division"
  },
  {
    "id": "div_2",
    "nameEn": "Rajshahi",
    "nameBn": "রাজশাহী",
    "type": "division"
  },
  {
    "id": "div_3",
    "nameEn": "Khulna",
    "nameBn": "খুলনা",
    "type": "division"
  },
  {
    "id": "div_4",
    "nameEn": "Barisal",
    "nameBn": "বরিশাল",
    "type": "division"
  },
  {
    "id": "div_5",
    "nameEn": "Sylhet",
    "nameBn": "সিলেট",
    "type": "division"
  },
  {
    "id": "div_6",
    "nameEn": "Dhaka",
    "nameBn": "ঢাকা",
    "type": "division"
  },
  {
    "id": "div_7",
    "nameEn": "Rangpur",
    "nameBn": "রংপুর",
    "type": "division"
  },
  {
    "id": "div_8",
    "nameEn": "Mymensingh",
    "nameBn": "ময়মনসিংহ",
    "type": "division"
  }
];

export const districts: LocationNode[] = [
  {
    "id": "dist_1",
    "nameEn": "Comilla",
    "nameBn": "কুমিল্লা",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_2",
    "nameEn": "Feni",
    "nameBn": "ফেনী",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_3",
    "nameEn": "Brahmanbaria",
    "nameBn": "ব্রাহ্মণবাড়িয়া",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_4",
    "nameEn": "Rangamati",
    "nameBn": "রাঙ্গামাটি",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_5",
    "nameEn": "Noakhali",
    "nameBn": "নোয়াখালী",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_6",
    "nameEn": "Chandpur",
    "nameBn": "চাঁদপুর",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_7",
    "nameEn": "Lakshmipur",
    "nameBn": "লক্ষ্মীপুর",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_8",
    "nameEn": "Chattogram",
    "nameBn": "চট্টগ্রাম",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_9",
    "nameEn": "Coxsbazar",
    "nameBn": "কক্সবাজার",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_10",
    "nameEn": "Khagrachhari",
    "nameBn": "খাগড়াছড়ি",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_11",
    "nameEn": "Bandarban",
    "nameBn": "বান্দরবান",
    "type": "district",
    "divisionId": "div_1"
  },
  {
    "id": "dist_12",
    "nameEn": "Sirajganj",
    "nameBn": "সিরাজগঞ্জ",
    "type": "district",
    "divisionId": "div_2"
  },
  {
    "id": "dist_13",
    "nameEn": "Pabna",
    "nameBn": "পাবনা",
    "type": "district",
    "divisionId": "div_2"
  },
  {
    "id": "dist_14",
    "nameEn": "Bogura",
    "nameBn": "বগুড়া",
    "type": "district",
    "divisionId": "div_2"
  },
  {
    "id": "dist_15",
    "nameEn": "Rajshahi",
    "nameBn": "রাজশাহী",
    "type": "district",
    "divisionId": "div_2"
  },
  {
    "id": "dist_16",
    "nameEn": "Natore",
    "nameBn": "নাটোর",
    "type": "district",
    "divisionId": "div_2"
  },
  {
    "id": "dist_17",
    "nameEn": "Joypurhat",
    "nameBn": "জয়পুরহাট",
    "type": "district",
    "divisionId": "div_2"
  },
  {
    "id": "dist_18",
    "nameEn": "Chapainawabganj",
    "nameBn": "চাঁপাইনবাবগঞ্জ",
    "type": "district",
    "divisionId": "div_2"
  },
  {
    "id": "dist_19",
    "nameEn": "Naogaon",
    "nameBn": "নওগাঁ",
    "type": "district",
    "divisionId": "div_2"
  },
  {
    "id": "dist_20",
    "nameEn": "Jashore",
    "nameBn": "যশোর",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_21",
    "nameEn": "Satkhira",
    "nameBn": "সাতক্ষীরা",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_22",
    "nameEn": "Meherpur",
    "nameBn": "মেহেরপুর",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_23",
    "nameEn": "Narail",
    "nameBn": "নড়াইল",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_24",
    "nameEn": "Chuadanga",
    "nameBn": "চুয়াডাঙ্গা",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_25",
    "nameEn": "Kushtia",
    "nameBn": "কুষ্টিয়া",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_26",
    "nameEn": "Magura",
    "nameBn": "মাগুরা",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_27",
    "nameEn": "Khulna",
    "nameBn": "খুলনা",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_28",
    "nameEn": "Bagerhat",
    "nameBn": "বাগেরহাট",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_29",
    "nameEn": "Jhenaidah",
    "nameBn": "ঝিনাইদহ",
    "type": "district",
    "divisionId": "div_3"
  },
  {
    "id": "dist_30",
    "nameEn": "Jhalakathi",
    "nameBn": "ঝালকাঠি",
    "type": "district",
    "divisionId": "div_4"
  },
  {
    "id": "dist_31",
    "nameEn": "Patuakhali",
    "nameBn": "পটুয়াখালী",
    "type": "district",
    "divisionId": "div_4"
  },
  {
    "id": "dist_32",
    "nameEn": "Pirojpur",
    "nameBn": "পিরোজপুর",
    "type": "district",
    "divisionId": "div_4"
  },
  {
    "id": "dist_33",
    "nameEn": "Barisal",
    "nameBn": "বরিশাল",
    "type": "district",
    "divisionId": "div_4"
  },
  {
    "id": "dist_34",
    "nameEn": "Bhola",
    "nameBn": "ভোলা",
    "type": "district",
    "divisionId": "div_4"
  },
  {
    "id": "dist_35",
    "nameEn": "Barguna",
    "nameBn": "বরগুনা",
    "type": "district",
    "divisionId": "div_4"
  },
  {
    "id": "dist_36",
    "nameEn": "Sylhet",
    "nameBn": "সিলেট",
    "type": "district",
    "divisionId": "div_5"
  },
  {
    "id": "dist_37",
    "nameEn": "Moulvibazar",
    "nameBn": "মৌলভীবাজার",
    "type": "district",
    "divisionId": "div_5"
  },
  {
    "id": "dist_38",
    "nameEn": "Habiganj",
    "nameBn": "হবিগঞ্জ",
    "type": "district",
    "divisionId": "div_5"
  },
  {
    "id": "dist_39",
    "nameEn": "Sunamganj",
    "nameBn": "সুনামগঞ্জ",
    "type": "district",
    "divisionId": "div_5"
  },
  {
    "id": "dist_40",
    "nameEn": "Narsingdi",
    "nameBn": "নরসিংদী",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_41",
    "nameEn": "Gazipur",
    "nameBn": "গাজীপুর",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_42",
    "nameEn": "Shariatpur",
    "nameBn": "শরীয়তপুর",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_43",
    "nameEn": "Narayanganj",
    "nameBn": "নারায়ণগঞ্জ",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_44",
    "nameEn": "Tangail",
    "nameBn": "টাঙ্গাইল",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_45",
    "nameEn": "Kishoreganj",
    "nameBn": "কিশোরগঞ্জ",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_46",
    "nameEn": "Manikganj",
    "nameBn": "মানিকগঞ্জ",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_47",
    "nameEn": "Dhaka",
    "nameBn": "ঢাকা",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_48",
    "nameEn": "Munshiganj",
    "nameBn": "মুন্সিগঞ্জ",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_49",
    "nameEn": "Rajbari",
    "nameBn": "রাজবাড়ী",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_50",
    "nameEn": "Madaripur",
    "nameBn": "মাদারীপুর",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_51",
    "nameEn": "Gopalganj",
    "nameBn": "গোপালগঞ্জ",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_52",
    "nameEn": "Faridpur",
    "nameBn": "ফরিদপুর",
    "type": "district",
    "divisionId": "div_6"
  },
  {
    "id": "dist_53",
    "nameEn": "Panchagarh",
    "nameBn": "পঞ্চগড়",
    "type": "district",
    "divisionId": "div_7"
  },
  {
    "id": "dist_54",
    "nameEn": "Dinajpur",
    "nameBn": "দিনা���পুর",
    "type": "district",
    "divisionId": "div_7"
  },
  {
    "id": "dist_55",
    "nameEn": "Lalmonirhat",
    "nameBn": "লালমনিরহাট",
    "type": "district",
    "divisionId": "div_7"
  },
  {
    "id": "dist_56",
    "nameEn": "Nilphamari",
    "nameBn": "নীলফামারী",
    "type": "district",
    "divisionId": "div_7"
  },
  {
    "id": "dist_57",
    "nameEn": "Gaibandha",
    "nameBn": "গাইবান্ধা",
    "type": "district",
    "divisionId": "div_7"
  },
  {
    "id": "dist_58",
    "nameEn": "Thakurgaon",
    "nameBn": "ঠাকুরগাঁও",
    "type": "district",
    "divisionId": "div_7"
  },
  {
    "id": "dist_59",
    "nameEn": "Rangpur",
    "nameBn": "রংপুর",
    "type": "district",
    "divisionId": "div_7"
  },
  {
    "id": "dist_60",
    "nameEn": "Kurigram",
    "nameBn": "কুড়িগ্রাম",
    "type": "district",
    "divisionId": "div_7"
  },
  {
    "id": "dist_61",
    "nameEn": "Sherpur",
    "nameBn": "শেরপুর",
    "type": "district",
    "divisionId": "div_8"
  },
  {
    "id": "dist_62",
    "nameEn": "Mymensingh",
    "nameBn": "ময়মনসিংহ",
    "type": "district",
    "divisionId": "div_8"
  },
  {
    "id": "dist_63",
    "nameEn": "Jamalpur",
    "nameBn": "জাম��লপুর",
    "type": "district",
    "divisionId": "div_8"
  },
  {
    "id": "dist_64",
    "nameEn": "Netrokona",
    "nameBn": "নেত্রকোণা",
    "type": "district",
    "divisionId": "div_8"
  }
];

export const upazilas: LocationNode[] = [
  {
    "id": "upa_1",
    "nameEn": "Debidwar",
    "nameBn": "দেবিদ্বার",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_2",
    "nameEn": "Barura",
    "nameBn": "বরুড়া",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_3",
    "nameEn": "Brahmanpara",
    "nameBn": "ব্রাহ্মণপাড়া",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_4",
    "nameEn": "Chandina",
    "nameBn": "চান্দিনা",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_5",
    "nameEn": "Chauddagram",
    "nameBn": "চৌদ্দগ্রাম",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_6",
    "nameEn": "Daudkandi",
    "nameBn": "দাউদকান্দি",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_7",
    "nameEn": "Homna",
    "nameBn": "হোমনা",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_8",
    "nameEn": "Laksam",
    "nameBn": "লাকসাম",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_9",
    "nameEn": "Muradnagar",
    "nameBn": "মুরাদনগর",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_10",
    "nameEn": "Nangalkot",
    "nameBn": "নাঙ্গলকোট",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_11",
    "nameEn": "Comilla Sadar",
    "nameBn": "কুমিল্লা সদর",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_12",
    "nameEn": "Meghna",
    "nameBn": "মেঘনা",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_13",
    "nameEn": "Monohargonj",
    "nameBn": "মনোহরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_14",
    "nameEn": "Sadarsouth",
    "nameBn": "সদর দক্ষিণ",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_15",
    "nameEn": "Titas",
    "nameBn": "তিতাস",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_16",
    "nameEn": "Burichang",
    "nameBn": "বুড়িচং",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_17",
    "nameEn": "Lalmai",
    "nameBn": "লালমাই",
    "type": "upazila",
    "districtId": "dist_1",
    "divisionId": "div_1"
  },
  {
    "id": "upa_18",
    "nameEn": "Chhagalnaiya",
    "nameBn": "ছাগলনাইয়া",
    "type": "upazila",
    "districtId": "dist_2",
    "divisionId": "div_1"
  },
  {
    "id": "upa_19",
    "nameEn": "Feni Sadar",
    "nameBn": "ফেনী সদর",
    "type": "upazila",
    "districtId": "dist_2",
    "divisionId": "div_1"
  },
  {
    "id": "upa_20",
    "nameEn": "Sonagazi",
    "nameBn": "সোনাগাজী",
    "type": "upazila",
    "districtId": "dist_2",
    "divisionId": "div_1"
  },
  {
    "id": "upa_21",
    "nameEn": "Fulgazi",
    "nameBn": "ফুলগাজী",
    "type": "upazila",
    "districtId": "dist_2",
    "divisionId": "div_1"
  },
  {
    "id": "upa_22",
    "nameEn": "Parshuram",
    "nameBn": "পরশুরাম",
    "type": "upazila",
    "districtId": "dist_2",
    "divisionId": "div_1"
  },
  {
    "id": "upa_23",
    "nameEn": "Daganbhuiyan",
    "nameBn": "দাগনভূঞা",
    "type": "upazila",
    "districtId": "dist_2",
    "divisionId": "div_1"
  },
  {
    "id": "upa_24",
    "nameEn": "Brahmanbaria Sadar",
    "nameBn": "ব্রাহ্মণবাড়িয়া সদর",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_25",
    "nameEn": "Kasba",
    "nameBn": "কসবা",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_26",
    "nameEn": "Nasirnagar",
    "nameBn": "নাসিরনগর",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_27",
    "nameEn": "Sarail",
    "nameBn": "সরাইল",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_28",
    "nameEn": "Ashuganj",
    "nameBn": "আশুগঞ্জ",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_29",
    "nameEn": "Akhaura",
    "nameBn": "আখাউড়া",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_30",
    "nameEn": "Nabinagar",
    "nameBn": "নবীনগর",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_31",
    "nameEn": "Bancharampur",
    "nameBn": "বাঞ্ছারামপুর",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_32",
    "nameEn": "Bijoynagar",
    "nameBn": "বিজয়নগর",
    "type": "upazila",
    "districtId": "dist_3",
    "divisionId": "div_1"
  },
  {
    "id": "upa_33",
    "nameEn": "Rangamati Sadar",
    "nameBn": "রাঙ্গামাটি সদর",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_34",
    "nameEn": "Kaptai",
    "nameBn": "কাপ্তাই",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_35",
    "nameEn": "Kawkhali",
    "nameBn": "কাউখালী",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_36",
    "nameEn": "Baghaichari",
    "nameBn": "বাঘাইছড়ি",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_37",
    "nameEn": "Barkal",
    "nameBn": "বরকল",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_38",
    "nameEn": "Langadu",
    "nameBn": "লংগদু",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_39",
    "nameEn": "Rajasthali",
    "nameBn": "রাজস্থলী",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_40",
    "nameEn": "Belaichari",
    "nameBn": "বিলাইছড়ি",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_41",
    "nameEn": "Juraichari",
    "nameBn": "জুরাছড়ি",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_42",
    "nameEn": "Naniarchar",
    "nameBn": "নানিয়ারচর",
    "type": "upazila",
    "districtId": "dist_4",
    "divisionId": "div_1"
  },
  {
    "id": "upa_43",
    "nameEn": "Noakhali Sadar",
    "nameBn": "নোয়াখালী সদর",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_44",
    "nameEn": "Companiganj",
    "nameBn": "কোম্পানীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_45",
    "nameEn": "Begumganj",
    "nameBn": "বেগমগঞ্জ",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_46",
    "nameEn": "Hatia",
    "nameBn": "হাতিয়া",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_47",
    "nameEn": "Subarnachar",
    "nameBn": "সুবর্ণচর",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_48",
    "nameEn": "Kabirhat",
    "nameBn": "কবিরহাট",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_49",
    "nameEn": "Senbug",
    "nameBn": "সেনবাগ",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_50",
    "nameEn": "Chatkhil",
    "nameBn": "চাটখিল",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_51",
    "nameEn": "Sonaimori",
    "nameBn": "সোনাইমুড়ী",
    "type": "upazila",
    "districtId": "dist_5",
    "divisionId": "div_1"
  },
  {
    "id": "upa_52",
    "nameEn": "Haimchar",
    "nameBn": "হাইমচর",
    "type": "upazila",
    "districtId": "dist_6",
    "divisionId": "div_1"
  },
  {
    "id": "upa_53",
    "nameEn": "Kachua",
    "nameBn": "কচুয়া",
    "type": "upazila",
    "districtId": "dist_6",
    "divisionId": "div_1"
  },
  {
    "id": "upa_54",
    "nameEn": "Shahrasti",
    "nameBn": "শাহরাস্তি\t",
    "type": "upazila",
    "districtId": "dist_6",
    "divisionId": "div_1"
  },
  {
    "id": "upa_55",
    "nameEn": "Chandpur Sadar",
    "nameBn": "চাঁদপুর সদর",
    "type": "upazila",
    "districtId": "dist_6",
    "divisionId": "div_1"
  },
  {
    "id": "upa_56",
    "nameEn": "Matlab South",
    "nameBn": "মতলব দক্ষিণ",
    "type": "upazila",
    "districtId": "dist_6",
    "divisionId": "div_1"
  },
  {
    "id": "upa_57",
    "nameEn": "Hajiganj",
    "nameBn": "হাজীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_6",
    "divisionId": "div_1"
  },
  {
    "id": "upa_58",
    "nameEn": "Matlab North",
    "nameBn": "মতলব উত্তর",
    "type": "upazila",
    "districtId": "dist_6",
    "divisionId": "div_1"
  },
  {
    "id": "upa_59",
    "nameEn": "Faridgonj",
    "nameBn": "ফরিদগঞ্জ",
    "type": "upazila",
    "districtId": "dist_6",
    "divisionId": "div_1"
  },
  {
    "id": "upa_60",
    "nameEn": "Lakshmipur Sadar",
    "nameBn": "লক্ষ্মীপুর সদর",
    "type": "upazila",
    "districtId": "dist_7",
    "divisionId": "div_1"
  },
  {
    "id": "upa_61",
    "nameEn": "Kamalnagar",
    "nameBn": "কমলনগর",
    "type": "upazila",
    "districtId": "dist_7",
    "divisionId": "div_1"
  },
  {
    "id": "upa_62",
    "nameEn": "Raipur",
    "nameBn": "রায়পুর",
    "type": "upazila",
    "districtId": "dist_7",
    "divisionId": "div_1"
  },
  {
    "id": "upa_63",
    "nameEn": "Ramgati",
    "nameBn": "রামগতি",
    "type": "upazila",
    "districtId": "dist_7",
    "divisionId": "div_1"
  },
  {
    "id": "upa_64",
    "nameEn": "Ramganj",
    "nameBn": "রামগঞ্জ",
    "type": "upazila",
    "districtId": "dist_7",
    "divisionId": "div_1"
  },
  {
    "id": "upa_65",
    "nameEn": "Rangunia",
    "nameBn": "রাঙ্গুনিয়া",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_66",
    "nameEn": "Sitakunda",
    "nameBn": "সীতাকুন্ড",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_67",
    "nameEn": "Mirsharai",
    "nameBn": "মীরসরাই",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_68",
    "nameEn": "Patiya",
    "nameBn": "পটিয়া",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_69",
    "nameEn": "Sandwip",
    "nameBn": "সন্দ্বীপ",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_70",
    "nameEn": "Banshkhali",
    "nameBn": "বাঁশখালী",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_71",
    "nameEn": "Boalkhali",
    "nameBn": "বোয়ালখালী",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_72",
    "nameEn": "Anwara",
    "nameBn": "আনোয়ারা",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_73",
    "nameEn": "Chandanaish",
    "nameBn": "চন্দনাইশ",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_74",
    "nameEn": "Satkania",
    "nameBn": "সাতকানিয়া",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_75",
    "nameEn": "Lohagara",
    "nameBn": "লোহাগাড়া",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_76",
    "nameEn": "Hathazari",
    "nameBn": "হাটহাজারী",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_77",
    "nameEn": "Fatikchhari",
    "nameBn": "ফটিকছড়ি",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_78",
    "nameEn": "Raozan",
    "nameBn": "রাউজান",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_79",
    "nameEn": "Karnafuli",
    "nameBn": "কর্ণফুলী",
    "type": "upazila",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "upa_80",
    "nameEn": "Coxsbazar Sadar",
    "nameBn": "কক্সবাজার সদর",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_81",
    "nameEn": "Chakaria",
    "nameBn": "চকরিয়া",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_82",
    "nameEn": "Kutubdia",
    "nameBn": "কুতুবদিয়া",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_83",
    "nameEn": "Ukhiya",
    "nameBn": "উখিয়া",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_84",
    "nameEn": "Moheshkhali",
    "nameBn": "মহেশখালী",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_85",
    "nameEn": "Pekua",
    "nameBn": "পেকুয়া",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_86",
    "nameEn": "Ramu",
    "nameBn": "রামু",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_87",
    "nameEn": "Teknaf",
    "nameBn": "টেকনাফ",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_88",
    "nameEn": "Khagrachhari Sadar",
    "nameBn": "খাগড়াছড়ি সদর",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_89",
    "nameEn": "Dighinala",
    "nameBn": "দিঘীনালা",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_90",
    "nameEn": "Panchari",
    "nameBn": "পানছড়ি",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_91",
    "nameEn": "Laxmichhari",
    "nameBn": "লক্ষীছড়ি",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_92",
    "nameEn": "Mohalchari",
    "nameBn": "মহালছড়ি",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_93",
    "nameEn": "Manikchari",
    "nameBn": "মানিকছড়ি",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_94",
    "nameEn": "Ramgarh",
    "nameBn": "রামগড়",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_95",
    "nameEn": "Matiranga",
    "nameBn": "মাটিরাঙ্গা",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_96",
    "nameEn": "Guimara",
    "nameBn": "গুইমারা",
    "type": "upazila",
    "districtId": "dist_10",
    "divisionId": "div_1"
  },
  {
    "id": "upa_97",
    "nameEn": "Bandarban Sadar",
    "nameBn": "বান্দরবান সদর",
    "type": "upazila",
    "districtId": "dist_11",
    "divisionId": "div_1"
  },
  {
    "id": "upa_98",
    "nameEn": "Alikadam",
    "nameBn": "আলীকদম",
    "type": "upazila",
    "districtId": "dist_11",
    "divisionId": "div_1"
  },
  {
    "id": "upa_99",
    "nameEn": "Naikhongchhari",
    "nameBn": "নাইক্ষ্যংছড়ি",
    "type": "upazila",
    "districtId": "dist_11",
    "divisionId": "div_1"
  },
  {
    "id": "upa_100",
    "nameEn": "Rowangchhari",
    "nameBn": "রোয়াংছড়ি",
    "type": "upazila",
    "districtId": "dist_11",
    "divisionId": "div_1"
  },
  {
    "id": "upa_101",
    "nameEn": "Lama",
    "nameBn": "লামা",
    "type": "upazila",
    "districtId": "dist_11",
    "divisionId": "div_1"
  },
  {
    "id": "upa_102",
    "nameEn": "Ruma",
    "nameBn": "রুমা",
    "type": "upazila",
    "districtId": "dist_11",
    "divisionId": "div_1"
  },
  {
    "id": "upa_103",
    "nameEn": "Thanchi",
    "nameBn": "থানচি",
    "type": "upazila",
    "districtId": "dist_11",
    "divisionId": "div_1"
  },
  {
    "id": "upa_104",
    "nameEn": "Belkuchi",
    "nameBn": "বেলকুচি",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_105",
    "nameEn": "Chauhali",
    "nameBn": "চৌহালি",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_106",
    "nameEn": "Kamarkhand",
    "nameBn": "কামারখন্দ",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_107",
    "nameEn": "Kazipur",
    "nameBn": "কাজীপুর",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_108",
    "nameEn": "Raigonj",
    "nameBn": "রায়গঞ্জ",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_109",
    "nameEn": "Shahjadpur",
    "nameBn": "শাহজাদপুর",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_110",
    "nameEn": "Sirajganj Sadar",
    "nameBn": "সিরাজগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_111",
    "nameEn": "Tarash",
    "nameBn": "তাড়াশ",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_112",
    "nameEn": "Ullapara",
    "nameBn": "উল্লাপাড়া",
    "type": "upazila",
    "districtId": "dist_12",
    "divisionId": "div_2"
  },
  {
    "id": "upa_113",
    "nameEn": "Sujanagar",
    "nameBn": "সুজানগর",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_114",
    "nameEn": "Ishurdi",
    "nameBn": "ঈশ্বরদী",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_115",
    "nameEn": "Bhangura",
    "nameBn": "ভাঙ্গুড়া",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_116",
    "nameEn": "Pabna Sadar",
    "nameBn": "পাবনা সদর",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_117",
    "nameEn": "Bera",
    "nameBn": "বেড়া",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_118",
    "nameEn": "Atghoria",
    "nameBn": "আটঘরিয়া",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_119",
    "nameEn": "Chatmohar",
    "nameBn": "চাটমোহর",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_120",
    "nameEn": "Santhia",
    "nameBn": "সাঁথিয়া",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_121",
    "nameEn": "Faridpur",
    "nameBn": "ফরিদপুর",
    "type": "upazila",
    "districtId": "dist_13",
    "divisionId": "div_2"
  },
  {
    "id": "upa_122",
    "nameEn": "Kahaloo",
    "nameBn": "কাহালু",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_123",
    "nameEn": "Bogra Sadar",
    "nameBn": "বগুড়া সদর",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_124",
    "nameEn": "Shariakandi",
    "nameBn": "সারিয়াকান্দি",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_125",
    "nameEn": "Shajahanpur",
    "nameBn": "শাজাহানপুর",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_126",
    "nameEn": "Dupchanchia",
    "nameBn": "দুপচাচিঁয়া",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_127",
    "nameEn": "Adamdighi",
    "nameBn": "আদমদিঘি",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_128",
    "nameEn": "Nondigram",
    "nameBn": "নন্দিগ্রাম",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_129",
    "nameEn": "Sonatala",
    "nameBn": "সোনাতলা",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_130",
    "nameEn": "Dhunot",
    "nameBn": "ধুনট",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_131",
    "nameEn": "Gabtali",
    "nameBn": "গাবতলী",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_132",
    "nameEn": "Sherpur",
    "nameBn": "শেরপুর",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_133",
    "nameEn": "Shibganj",
    "nameBn": "শিবগঞ্জ",
    "type": "upazila",
    "districtId": "dist_14",
    "divisionId": "div_2"
  },
  {
    "id": "upa_134",
    "nameEn": "Paba",
    "nameBn": "পবা",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_135",
    "nameEn": "Durgapur",
    "nameBn": "দু���্গাপুর",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_136",
    "nameEn": "Mohonpur",
    "nameBn": "মোহনপুর",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_137",
    "nameEn": "Charghat",
    "nameBn": "চারঘাট",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_138",
    "nameEn": "Puthia",
    "nameBn": "পুঠিয়া",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_139",
    "nameEn": "Bagha",
    "nameBn": "বাঘা",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_140",
    "nameEn": "Godagari",
    "nameBn": "গোদাগাড়ী",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_141",
    "nameEn": "Tanore",
    "nameBn": "তানোর",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_142",
    "nameEn": "Bagmara",
    "nameBn": "বাগমারা",
    "type": "upazila",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "upa_143",
    "nameEn": "Natore Sadar",
    "nameBn": "নাটোর সদর",
    "type": "upazila",
    "districtId": "dist_16",
    "divisionId": "div_2"
  },
  {
    "id": "upa_144",
    "nameEn": "Singra",
    "nameBn": "সিংড়া",
    "type": "upazila",
    "districtId": "dist_16",
    "divisionId": "div_2"
  },
  {
    "id": "upa_145",
    "nameEn": "Baraigram",
    "nameBn": "বড়াইগ্রাম",
    "type": "upazila",
    "districtId": "dist_16",
    "divisionId": "div_2"
  },
  {
    "id": "upa_146",
    "nameEn": "Bagatipara",
    "nameBn": "বাগাতিপাড়া",
    "type": "upazila",
    "districtId": "dist_16",
    "divisionId": "div_2"
  },
  {
    "id": "upa_147",
    "nameEn": "Lalpur",
    "nameBn": "লালপুর",
    "type": "upazila",
    "districtId": "dist_16",
    "divisionId": "div_2"
  },
  {
    "id": "upa_148",
    "nameEn": "Gurudaspur",
    "nameBn": "গুরুদাসপুর",
    "type": "upazila",
    "districtId": "dist_16",
    "divisionId": "div_2"
  },
  {
    "id": "upa_149",
    "nameEn": "Naldanga",
    "nameBn": "নলডাঙ্গা",
    "type": "upazila",
    "districtId": "dist_16",
    "divisionId": "div_2"
  },
  {
    "id": "upa_150",
    "nameEn": "Akkelpur",
    "nameBn": "আক্কেলপুর",
    "type": "upazila",
    "districtId": "dist_17",
    "divisionId": "div_2"
  },
  {
    "id": "upa_151",
    "nameEn": "Kalai",
    "nameBn": "কালাই",
    "type": "upazila",
    "districtId": "dist_17",
    "divisionId": "div_2"
  },
  {
    "id": "upa_152",
    "nameEn": "Khetlal",
    "nameBn": "ক্ষেতলাল",
    "type": "upazila",
    "districtId": "dist_17",
    "divisionId": "div_2"
  },
  {
    "id": "upa_153",
    "nameEn": "Panchbibi",
    "nameBn": "পাঁচবিবি",
    "type": "upazila",
    "districtId": "dist_17",
    "divisionId": "div_2"
  },
  {
    "id": "upa_154",
    "nameEn": "Joypurhat Sadar",
    "nameBn": "জয়পুরহাট সদর",
    "type": "upazila",
    "districtId": "dist_17",
    "divisionId": "div_2"
  },
  {
    "id": "upa_155",
    "nameEn": "Chapainawabganj Sadar",
    "nameBn": "চাঁপাইনবাবগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_18",
    "divisionId": "div_2"
  },
  {
    "id": "upa_156",
    "nameEn": "Gomostapur",
    "nameBn": "গোমস্তাপুর",
    "type": "upazila",
    "districtId": "dist_18",
    "divisionId": "div_2"
  },
  {
    "id": "upa_157",
    "nameEn": "Nachol",
    "nameBn": "নাচোল",
    "type": "upazila",
    "districtId": "dist_18",
    "divisionId": "div_2"
  },
  {
    "id": "upa_158",
    "nameEn": "Bholahat",
    "nameBn": "ভোলাহাট",
    "type": "upazila",
    "districtId": "dist_18",
    "divisionId": "div_2"
  },
  {
    "id": "upa_159",
    "nameEn": "Shibganj",
    "nameBn": "শিবগঞ্জ",
    "type": "upazila",
    "districtId": "dist_18",
    "divisionId": "div_2"
  },
  {
    "id": "upa_160",
    "nameEn": "Mohadevpur",
    "nameBn": "মহাদেবপুর",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_161",
    "nameEn": "Badalgachi",
    "nameBn": "বদলগাছী",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_162",
    "nameEn": "Patnitala",
    "nameBn": "পত্নিতলা",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_163",
    "nameEn": "Dhamoirhat",
    "nameBn": "ধামইরহাট",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_164",
    "nameEn": "Niamatpur",
    "nameBn": "নিয়ামতপুর",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_165",
    "nameEn": "Manda",
    "nameBn": "মান্দা",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_166",
    "nameEn": "Atrai",
    "nameBn": "আত্রাই",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_167",
    "nameEn": "Raninagar",
    "nameBn": "রাণীনগর",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_168",
    "nameEn": "Naogaon Sadar",
    "nameBn": "নওগাঁ সদর",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_169",
    "nameEn": "Porsha",
    "nameBn": "পোরশা",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_170",
    "nameEn": "Sapahar",
    "nameBn": "সাপাহার",
    "type": "upazila",
    "districtId": "dist_19",
    "divisionId": "div_2"
  },
  {
    "id": "upa_171",
    "nameEn": "Manirampur",
    "nameBn": "মণিরামপুর",
    "type": "upazila",
    "districtId": "dist_20",
    "divisionId": "div_3"
  },
  {
    "id": "upa_172",
    "nameEn": "Abhaynagar",
    "nameBn": "অভয়নগর",
    "type": "upazila",
    "districtId": "dist_20",
    "divisionId": "div_3"
  },
  {
    "id": "upa_173",
    "nameEn": "Bagherpara",
    "nameBn": "বাঘারপাড়া",
    "type": "upazila",
    "districtId": "dist_20",
    "divisionId": "div_3"
  },
  {
    "id": "upa_174",
    "nameEn": "Chougachha",
    "nameBn": "চৌগাছা",
    "type": "upazila",
    "districtId": "dist_20",
    "divisionId": "div_3"
  },
  {
    "id": "upa_175",
    "nameEn": "Jhikargacha",
    "nameBn": "ঝিকরগাছা",
    "type": "upazila",
    "districtId": "dist_20",
    "divisionId": "div_3"
  },
  {
    "id": "upa_176",
    "nameEn": "Keshabpur",
    "nameBn": "কেশবপুর",
    "type": "upazila",
    "districtId": "dist_20",
    "divisionId": "div_3"
  },
  {
    "id": "upa_177",
    "nameEn": "Jessore Sadar",
    "nameBn": "যশোর সদর",
    "type": "upazila",
    "districtId": "dist_20",
    "divisionId": "div_3"
  },
  {
    "id": "upa_178",
    "nameEn": "Sharsha",
    "nameBn": "শার্শা",
    "type": "upazila",
    "districtId": "dist_20",
    "divisionId": "div_3"
  },
  {
    "id": "upa_179",
    "nameEn": "Assasuni",
    "nameBn": "আশাশুনি",
    "type": "upazila",
    "districtId": "dist_21",
    "divisionId": "div_3"
  },
  {
    "id": "upa_180",
    "nameEn": "Debhata",
    "nameBn": "দেবহাটা",
    "type": "upazila",
    "districtId": "dist_21",
    "divisionId": "div_3"
  },
  {
    "id": "upa_181",
    "nameEn": "Kalaroa",
    "nameBn": "কলারোয়া",
    "type": "upazila",
    "districtId": "dist_21",
    "divisionId": "div_3"
  },
  {
    "id": "upa_182",
    "nameEn": "Satkhira Sadar",
    "nameBn": "সাতক্ষীরা সদর",
    "type": "upazila",
    "districtId": "dist_21",
    "divisionId": "div_3"
  },
  {
    "id": "upa_183",
    "nameEn": "Shyamnagar",
    "nameBn": "শ্যামনগর",
    "type": "upazila",
    "districtId": "dist_21",
    "divisionId": "div_3"
  },
  {
    "id": "upa_184",
    "nameEn": "Tala",
    "nameBn": "তালা",
    "type": "upazila",
    "districtId": "dist_21",
    "divisionId": "div_3"
  },
  {
    "id": "upa_185",
    "nameEn": "Kaliganj",
    "nameBn": "কালিগঞ্জ",
    "type": "upazila",
    "districtId": "dist_21",
    "divisionId": "div_3"
  },
  {
    "id": "upa_186",
    "nameEn": "Mujibnagar",
    "nameBn": "মুজিবনগর",
    "type": "upazila",
    "districtId": "dist_22",
    "divisionId": "div_3"
  },
  {
    "id": "upa_187",
    "nameEn": "Meherpur Sadar",
    "nameBn": "মেহেরপুর সদর",
    "type": "upazila",
    "districtId": "dist_22",
    "divisionId": "div_3"
  },
  {
    "id": "upa_188",
    "nameEn": "Gangni",
    "nameBn": "গাংনী",
    "type": "upazila",
    "districtId": "dist_22",
    "divisionId": "div_3"
  },
  {
    "id": "upa_189",
    "nameEn": "Narail Sadar",
    "nameBn": "নড়াইল সদর",
    "type": "upazila",
    "districtId": "dist_23",
    "divisionId": "div_3"
  },
  {
    "id": "upa_190",
    "nameEn": "Lohagara",
    "nameBn": "লোহাগড়া",
    "type": "upazila",
    "districtId": "dist_23",
    "divisionId": "div_3"
  },
  {
    "id": "upa_191",
    "nameEn": "Kalia",
    "nameBn": "কালিয়া",
    "type": "upazila",
    "districtId": "dist_23",
    "divisionId": "div_3"
  },
  {
    "id": "upa_192",
    "nameEn": "Chuadanga Sadar",
    "nameBn": "চুয়াডাঙ্গা সদর",
    "type": "upazila",
    "districtId": "dist_24",
    "divisionId": "div_3"
  },
  {
    "id": "upa_193",
    "nameEn": "Alamdanga",
    "nameBn": "আলমডাঙ্গা",
    "type": "upazila",
    "districtId": "dist_24",
    "divisionId": "div_3"
  },
  {
    "id": "upa_194",
    "nameEn": "Damurhuda",
    "nameBn": "দামুড়হুদা",
    "type": "upazila",
    "districtId": "dist_24",
    "divisionId": "div_3"
  },
  {
    "id": "upa_195",
    "nameEn": "Jibannagar",
    "nameBn": "জীবননগর",
    "type": "upazila",
    "districtId": "dist_24",
    "divisionId": "div_3"
  },
  {
    "id": "upa_196",
    "nameEn": "Kushtia Sadar",
    "nameBn": "কুষ্টিয়া সদর",
    "type": "upazila",
    "districtId": "dist_25",
    "divisionId": "div_3"
  },
  {
    "id": "upa_197",
    "nameEn": "Kumarkhali",
    "nameBn": "কুমারখালী",
    "type": "upazila",
    "districtId": "dist_25",
    "divisionId": "div_3"
  },
  {
    "id": "upa_198",
    "nameEn": "Khoksa",
    "nameBn": "খোকসা",
    "type": "upazila",
    "districtId": "dist_25",
    "divisionId": "div_3"
  },
  {
    "id": "upa_199",
    "nameEn": "Mirpur",
    "nameBn": "মিরপুর",
    "type": "upazila",
    "districtId": "dist_25",
    "divisionId": "div_3"
  },
  {
    "id": "upa_200",
    "nameEn": "Daulatpur",
    "nameBn": "দৌলতপুর",
    "type": "upazila",
    "districtId": "dist_25",
    "divisionId": "div_3"
  },
  {
    "id": "upa_201",
    "nameEn": "Bheramara",
    "nameBn": "ভেড়ামারা",
    "type": "upazila",
    "districtId": "dist_25",
    "divisionId": "div_3"
  },
  {
    "id": "upa_202",
    "nameEn": "Shalikha",
    "nameBn": "শালিখা",
    "type": "upazila",
    "districtId": "dist_26",
    "divisionId": "div_3"
  },
  {
    "id": "upa_203",
    "nameEn": "Sreepur",
    "nameBn": "শ্রীপুর",
    "type": "upazila",
    "districtId": "dist_26",
    "divisionId": "div_3"
  },
  {
    "id": "upa_204",
    "nameEn": "Magura Sadar",
    "nameBn": "মাগুরা সদর",
    "type": "upazila",
    "districtId": "dist_26",
    "divisionId": "div_3"
  },
  {
    "id": "upa_205",
    "nameEn": "Mohammadpur",
    "nameBn": "মহম্মদপুর",
    "type": "upazila",
    "districtId": "dist_26",
    "divisionId": "div_3"
  },
  {
    "id": "upa_206",
    "nameEn": "Paikgasa",
    "nameBn": "পাইকগাছা",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_207",
    "nameEn": "Fultola",
    "nameBn": "ফুলতলা",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_208",
    "nameEn": "Digholia",
    "nameBn": "দিঘলিয়া",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_209",
    "nameEn": "Rupsha",
    "nameBn": "রূপসা",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_210",
    "nameEn": "Terokhada",
    "nameBn": "তেরখাদা",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_211",
    "nameEn": "Dumuria",
    "nameBn": "ডুমুরিয়া",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_212",
    "nameEn": "Botiaghata",
    "nameBn": "বটিয়াঘাটা",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_213",
    "nameEn": "Dakop",
    "nameBn": "দাকোপ",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_214",
    "nameEn": "Koyra",
    "nameBn": "কয়রা",
    "type": "upazila",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "upa_215",
    "nameEn": "Fakirhat",
    "nameBn": "ফকিরহাট",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_216",
    "nameEn": "Bagerhat Sadar",
    "nameBn": "বাগেরহাট সদর",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_217",
    "nameEn": "Mollahat",
    "nameBn": "মোল্লাহাট",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_218",
    "nameEn": "Sarankhola",
    "nameBn": "শরণখোলা",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_219",
    "nameEn": "Rampal",
    "nameBn": "রামপাল",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_220",
    "nameEn": "Morrelganj",
    "nameBn": "মোড়েলগঞ্জ",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_221",
    "nameEn": "Kachua",
    "nameBn": "কচুয়া",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_222",
    "nameEn": "Mongla",
    "nameBn": "মোংলা",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_223",
    "nameEn": "Chitalmari",
    "nameBn": "চিতলমারী",
    "type": "upazila",
    "districtId": "dist_28",
    "divisionId": "div_3"
  },
  {
    "id": "upa_224",
    "nameEn": "Jhenaidah Sadar",
    "nameBn": "ঝিনাইদহ সদর",
    "type": "upazila",
    "districtId": "dist_29",
    "divisionId": "div_3"
  },
  {
    "id": "upa_225",
    "nameEn": "Shailkupa",
    "nameBn": "শৈলকুপা",
    "type": "upazila",
    "districtId": "dist_29",
    "divisionId": "div_3"
  },
  {
    "id": "upa_226",
    "nameEn": "Harinakundu",
    "nameBn": "হরিণাকুন্ডু",
    "type": "upazila",
    "districtId": "dist_29",
    "divisionId": "div_3"
  },
  {
    "id": "upa_227",
    "nameEn": "Kaliganj",
    "nameBn": "কালীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_29",
    "divisionId": "div_3"
  },
  {
    "id": "upa_228",
    "nameEn": "Kotchandpur",
    "nameBn": "কোটচাঁদপুর",
    "type": "upazila",
    "districtId": "dist_29",
    "divisionId": "div_3"
  },
  {
    "id": "upa_229",
    "nameEn": "Moheshpur",
    "nameBn": "মহেশপুর",
    "type": "upazila",
    "districtId": "dist_29",
    "divisionId": "div_3"
  },
  {
    "id": "upa_230",
    "nameEn": "Jhalakathi Sadar",
    "nameBn": "ঝালকাঠি সদর",
    "type": "upazila",
    "districtId": "dist_30",
    "divisionId": "div_4"
  },
  {
    "id": "upa_231",
    "nameEn": "Kathalia",
    "nameBn": "কাঠালিয়া",
    "type": "upazila",
    "districtId": "dist_30",
    "divisionId": "div_4"
  },
  {
    "id": "upa_232",
    "nameEn": "Nalchity",
    "nameBn": "নলছিটি",
    "type": "upazila",
    "districtId": "dist_30",
    "divisionId": "div_4"
  },
  {
    "id": "upa_233",
    "nameEn": "Rajapur",
    "nameBn": "রাজাপুর",
    "type": "upazila",
    "districtId": "dist_30",
    "divisionId": "div_4"
  },
  {
    "id": "upa_234",
    "nameEn": "Bauphal",
    "nameBn": "বাউফল",
    "type": "upazila",
    "districtId": "dist_31",
    "divisionId": "div_4"
  },
  {
    "id": "upa_235",
    "nameEn": "Patuakhali Sadar",
    "nameBn": "পটুয়াখালী সদর",
    "type": "upazila",
    "districtId": "dist_31",
    "divisionId": "div_4"
  },
  {
    "id": "upa_236",
    "nameEn": "Dumki",
    "nameBn": "দুমকি",
    "type": "upazila",
    "districtId": "dist_31",
    "divisionId": "div_4"
  },
  {
    "id": "upa_237",
    "nameEn": "Dashmina",
    "nameBn": "দশমিনা",
    "type": "upazila",
    "districtId": "dist_31",
    "divisionId": "div_4"
  },
  {
    "id": "upa_238",
    "nameEn": "Kalapara",
    "nameBn": "কলাপাড়া",
    "type": "upazila",
    "districtId": "dist_31",
    "divisionId": "div_4"
  },
  {
    "id": "upa_239",
    "nameEn": "Mirzaganj",
    "nameBn": "মির্জাগঞ্জ",
    "type": "upazila",
    "districtId": "dist_31",
    "divisionId": "div_4"
  },
  {
    "id": "upa_240",
    "nameEn": "Galachipa",
    "nameBn": "গলাচিপা",
    "type": "upazila",
    "districtId": "dist_31",
    "divisionId": "div_4"
  },
  {
    "id": "upa_241",
    "nameEn": "Rangabali",
    "nameBn": "রাঙ্গাবালী",
    "type": "upazila",
    "districtId": "dist_31",
    "divisionId": "div_4"
  },
  {
    "id": "upa_242",
    "nameEn": "Pirojpur Sadar",
    "nameBn": "পিরোজপুর সদর",
    "type": "upazila",
    "districtId": "dist_32",
    "divisionId": "div_4"
  },
  {
    "id": "upa_243",
    "nameEn": "Nazirpur",
    "nameBn": "নাজিরপুর",
    "type": "upazila",
    "districtId": "dist_32",
    "divisionId": "div_4"
  },
  {
    "id": "upa_244",
    "nameEn": "Kawkhali",
    "nameBn": "কাউখালী",
    "type": "upazila",
    "districtId": "dist_32",
    "divisionId": "div_4"
  },
  {
    "id": "upa_245",
    "nameEn": "Zianagar",
    "nameBn": "জিয়ানগর",
    "type": "upazila",
    "districtId": "dist_32",
    "divisionId": "div_4"
  },
  {
    "id": "upa_246",
    "nameEn": "Bhandaria",
    "nameBn": "ভান্ডারিয়া",
    "type": "upazila",
    "districtId": "dist_32",
    "divisionId": "div_4"
  },
  {
    "id": "upa_247",
    "nameEn": "Mathbaria",
    "nameBn": "মঠবাড়ীয়া",
    "type": "upazila",
    "districtId": "dist_32",
    "divisionId": "div_4"
  },
  {
    "id": "upa_248",
    "nameEn": "Nesarabad",
    "nameBn": "নেছারাবাদ",
    "type": "upazila",
    "districtId": "dist_32",
    "divisionId": "div_4"
  },
  {
    "id": "upa_249",
    "nameEn": "Barisal Sadar",
    "nameBn": "বরিশাল সদর",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_250",
    "nameEn": "Bakerganj",
    "nameBn": "বাকেরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_251",
    "nameEn": "Babuganj",
    "nameBn": "বাবুগঞ্জ",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_252",
    "nameEn": "Wazirpur",
    "nameBn": "উজিরপুর",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_253",
    "nameEn": "Banaripara",
    "nameBn": "বানারীপাড়া",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_254",
    "nameEn": "Gournadi",
    "nameBn": "গৌরনদী",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_255",
    "nameEn": "Agailjhara",
    "nameBn": "আগৈলঝাড়া",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_256",
    "nameEn": "Mehendiganj",
    "nameBn": "মেহেন্দিগঞ্জ",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_257",
    "nameEn": "Muladi",
    "nameBn": "মুলাদী",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_258",
    "nameEn": "Hizla",
    "nameBn": "হিজলা",
    "type": "upazila",
    "districtId": "dist_33",
    "divisionId": "div_4"
  },
  {
    "id": "upa_259",
    "nameEn": "Bhola Sadar",
    "nameBn": "ভোলা সদর",
    "type": "upazila",
    "districtId": "dist_34",
    "divisionId": "div_4"
  },
  {
    "id": "upa_260",
    "nameEn": "Borhan Sddin",
    "nameBn": "বোরহান উদ্দিন",
    "type": "upazila",
    "districtId": "dist_34",
    "divisionId": "div_4"
  },
  {
    "id": "upa_261",
    "nameEn": "Charfesson",
    "nameBn": "চরফ্যাশন",
    "type": "upazila",
    "districtId": "dist_34",
    "divisionId": "div_4"
  },
  {
    "id": "upa_262",
    "nameEn": "Doulatkhan",
    "nameBn": "দৌলতখান",
    "type": "upazila",
    "districtId": "dist_34",
    "divisionId": "div_4"
  },
  {
    "id": "upa_263",
    "nameEn": "Monpura",
    "nameBn": "মনপুরা",
    "type": "upazila",
    "districtId": "dist_34",
    "divisionId": "div_4"
  },
  {
    "id": "upa_264",
    "nameEn": "Tazumuddin",
    "nameBn": "তজুমদ্দিন",
    "type": "upazila",
    "districtId": "dist_34",
    "divisionId": "div_4"
  },
  {
    "id": "upa_265",
    "nameEn": "Lalmohan",
    "nameBn": "লালমোহন",
    "type": "upazila",
    "districtId": "dist_34",
    "divisionId": "div_4"
  },
  {
    "id": "upa_266",
    "nameEn": "Amtali",
    "nameBn": "আমতলী",
    "type": "upazila",
    "districtId": "dist_35",
    "divisionId": "div_4"
  },
  {
    "id": "upa_267",
    "nameEn": "Barguna Sadar",
    "nameBn": "বরগুনা সদর",
    "type": "upazila",
    "districtId": "dist_35",
    "divisionId": "div_4"
  },
  {
    "id": "upa_268",
    "nameEn": "Betagi",
    "nameBn": "বেতাগী",
    "type": "upazila",
    "districtId": "dist_35",
    "divisionId": "div_4"
  },
  {
    "id": "upa_269",
    "nameEn": "Bamna",
    "nameBn": "বামনা",
    "type": "upazila",
    "districtId": "dist_35",
    "divisionId": "div_4"
  },
  {
    "id": "upa_270",
    "nameEn": "Pathorghata",
    "nameBn": "পাথরঘাটা",
    "type": "upazila",
    "districtId": "dist_35",
    "divisionId": "div_4"
  },
  {
    "id": "upa_271",
    "nameEn": "Taltali",
    "nameBn": "তালতলি",
    "type": "upazila",
    "districtId": "dist_35",
    "divisionId": "div_4"
  },
  {
    "id": "upa_272",
    "nameEn": "Balaganj",
    "nameBn": "বালাগঞ্জ",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_273",
    "nameEn": "Beanibazar",
    "nameBn": "বিয়ানীবাজার",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_274",
    "nameEn": "Bishwanath",
    "nameBn": "বিশ্বনাথ",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_275",
    "nameEn": "Companiganj",
    "nameBn": "কোম্পানীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_276",
    "nameEn": "Fenchuganj",
    "nameBn": "ফেঞ্চুগঞ্জ",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_277",
    "nameEn": "Golapganj",
    "nameBn": "গোলাপগঞ্জ",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_278",
    "nameEn": "Gowainghat",
    "nameBn": "গোয়াইনঘাট",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_279",
    "nameEn": "Jaintiapur",
    "nameBn": "জৈন্তাপুর",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_280",
    "nameEn": "Kanaighat",
    "nameBn": "কানাইঘাট",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_281",
    "nameEn": "Sylhet Sadar",
    "nameBn": "সিলেট সদর",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_282",
    "nameEn": "Zakiganj",
    "nameBn": "জকিগঞ্জ",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_283",
    "nameEn": "Dakshinsurma",
    "nameBn": "দক্ষিণ সুরমা",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_284",
    "nameEn": "Osmaninagar",
    "nameBn": "ওসমানী নগর",
    "type": "upazila",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "upa_285",
    "nameEn": "Barlekha",
    "nameBn": "বড়লেখা",
    "type": "upazila",
    "districtId": "dist_37",
    "divisionId": "div_5"
  },
  {
    "id": "upa_286",
    "nameEn": "Kamolganj",
    "nameBn": "কমলগঞ্জ",
    "type": "upazila",
    "districtId": "dist_37",
    "divisionId": "div_5"
  },
  {
    "id": "upa_287",
    "nameEn": "Kulaura",
    "nameBn": "কুলাউড়া",
    "type": "upazila",
    "districtId": "dist_37",
    "divisionId": "div_5"
  },
  {
    "id": "upa_288",
    "nameEn": "Moulvibazar Sadar",
    "nameBn": "মৌলভীবাজার সদর",
    "type": "upazila",
    "districtId": "dist_37",
    "divisionId": "div_5"
  },
  {
    "id": "upa_289",
    "nameEn": "Rajnagar",
    "nameBn": "রাজনগর",
    "type": "upazila",
    "districtId": "dist_37",
    "divisionId": "div_5"
  },
  {
    "id": "upa_290",
    "nameEn": "Sreemangal",
    "nameBn": "শ্রীমঙ্গল",
    "type": "upazila",
    "districtId": "dist_37",
    "divisionId": "div_5"
  },
  {
    "id": "upa_291",
    "nameEn": "Juri",
    "nameBn": "জুড়ী",
    "type": "upazila",
    "districtId": "dist_37",
    "divisionId": "div_5"
  },
  {
    "id": "upa_292",
    "nameEn": "Nabiganj",
    "nameBn": "নবীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_38",
    "divisionId": "div_5"
  },
  {
    "id": "upa_293",
    "nameEn": "Bahubal",
    "nameBn": "বাহুবল",
    "type": "upazila",
    "districtId": "dist_38",
    "divisionId": "div_5"
  },
  {
    "id": "upa_294",
    "nameEn": "Ajmiriganj",
    "nameBn": "আজমিরীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_38",
    "divisionId": "div_5"
  },
  {
    "id": "upa_295",
    "nameEn": "Baniachong",
    "nameBn": "বানিয়াচং",
    "type": "upazila",
    "districtId": "dist_38",
    "divisionId": "div_5"
  },
  {
    "id": "upa_296",
    "nameEn": "Lakhai",
    "nameBn": "লাখাই",
    "type": "upazila",
    "districtId": "dist_38",
    "divisionId": "div_5"
  },
  {
    "id": "upa_297",
    "nameEn": "Chunarughat",
    "nameBn": "চুনারুঘাট",
    "type": "upazila",
    "districtId": "dist_38",
    "divisionId": "div_5"
  },
  {
    "id": "upa_298",
    "nameEn": "Habiganj Sadar",
    "nameBn": "হবিগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_38",
    "divisionId": "div_5"
  },
  {
    "id": "upa_299",
    "nameEn": "Madhabpur",
    "nameBn": "মাধবপুর",
    "type": "upazila",
    "districtId": "dist_38",
    "divisionId": "div_5"
  },
  {
    "id": "upa_300",
    "nameEn": "Sunamganj Sadar",
    "nameBn": "সুনামগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_301",
    "nameEn": "South Sunamganj",
    "nameBn": "দক্ষিণ সুনামগঞ্জ",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_302",
    "nameEn": "Bishwambarpur",
    "nameBn": "বিশ্বম্ভরপুর",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_303",
    "nameEn": "Chhatak",
    "nameBn": "ছাতক",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_304",
    "nameEn": "Jagannathpur",
    "nameBn": "জগন্নাথপুর",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_305",
    "nameEn": "Dowarabazar",
    "nameBn": "দোয়ারাবাজার",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_306",
    "nameEn": "Tahirpur",
    "nameBn": "তাহিরপুর",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_307",
    "nameEn": "Dharmapasha",
    "nameBn": "ধর্মপাশা",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_308",
    "nameEn": "Jamalganj",
    "nameBn": "জামালগঞ্জ",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_309",
    "nameEn": "Shalla",
    "nameBn": "শাল্লা",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_310",
    "nameEn": "Derai",
    "nameBn": "দিরাই",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_311",
    "nameEn": "Belabo",
    "nameBn": "বেলাবো",
    "type": "upazila",
    "districtId": "dist_40",
    "divisionId": "div_6"
  },
  {
    "id": "upa_312",
    "nameEn": "Monohardi",
    "nameBn": "মনোহরদী",
    "type": "upazila",
    "districtId": "dist_40",
    "divisionId": "div_6"
  },
  {
    "id": "upa_313",
    "nameEn": "Narsingdi Sadar",
    "nameBn": "নরসিংদী সদর",
    "type": "upazila",
    "districtId": "dist_40",
    "divisionId": "div_6"
  },
  {
    "id": "upa_314",
    "nameEn": "Palash",
    "nameBn": "পলাশ",
    "type": "upazila",
    "districtId": "dist_40",
    "divisionId": "div_6"
  },
  {
    "id": "upa_315",
    "nameEn": "Raipura",
    "nameBn": "রায়পুরা",
    "type": "upazila",
    "districtId": "dist_40",
    "divisionId": "div_6"
  },
  {
    "id": "upa_316",
    "nameEn": "Shibpur",
    "nameBn": "শিবপুর",
    "type": "upazila",
    "districtId": "dist_40",
    "divisionId": "div_6"
  },
  {
    "id": "upa_317",
    "nameEn": "Kaliganj",
    "nameBn": "কালীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_41",
    "divisionId": "div_6"
  },
  {
    "id": "upa_318",
    "nameEn": "Kaliakair",
    "nameBn": "কালিয়াকৈর",
    "type": "upazila",
    "districtId": "dist_41",
    "divisionId": "div_6"
  },
  {
    "id": "upa_319",
    "nameEn": "Kapasia",
    "nameBn": "কাপাসিয়া",
    "type": "upazila",
    "districtId": "dist_41",
    "divisionId": "div_6"
  },
  {
    "id": "upa_320",
    "nameEn": "Gazipur Sadar",
    "nameBn": "গাজীপুর সদর",
    "type": "upazila",
    "districtId": "dist_41",
    "divisionId": "div_6"
  },
  {
    "id": "upa_321",
    "nameEn": "Sreepur",
    "nameBn": "শ্রীপুর",
    "type": "upazila",
    "districtId": "dist_41",
    "divisionId": "div_6"
  },
  {
    "id": "upa_322",
    "nameEn": "Shariatpur Sadar",
    "nameBn": "শরিয়তপুর সদর",
    "type": "upazila",
    "districtId": "dist_42",
    "divisionId": "div_6"
  },
  {
    "id": "upa_323",
    "nameEn": "Naria",
    "nameBn": "নড়িয়া",
    "type": "upazila",
    "districtId": "dist_42",
    "divisionId": "div_6"
  },
  {
    "id": "upa_324",
    "nameEn": "Zajira",
    "nameBn": "জাজিরা",
    "type": "upazila",
    "districtId": "dist_42",
    "divisionId": "div_6"
  },
  {
    "id": "upa_325",
    "nameEn": "Gosairhat",
    "nameBn": "গোসাইরহাট",
    "type": "upazila",
    "districtId": "dist_42",
    "divisionId": "div_6"
  },
  {
    "id": "upa_326",
    "nameEn": "Bhedarganj",
    "nameBn": "ভেদরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_42",
    "divisionId": "div_6"
  },
  {
    "id": "upa_327",
    "nameEn": "Damudya",
    "nameBn": "ডামুড্যা",
    "type": "upazila",
    "districtId": "dist_42",
    "divisionId": "div_6"
  },
  {
    "id": "upa_328",
    "nameEn": "Araihazar",
    "nameBn": "আড়াইহাজার",
    "type": "upazila",
    "districtId": "dist_43",
    "divisionId": "div_6"
  },
  {
    "id": "upa_329",
    "nameEn": "Bandar",
    "nameBn": "বন্দর",
    "type": "upazila",
    "districtId": "dist_43",
    "divisionId": "div_6"
  },
  {
    "id": "upa_330",
    "nameEn": "Narayanganj Sadar",
    "nameBn": "নারায়নগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_43",
    "divisionId": "div_6"
  },
  {
    "id": "upa_331",
    "nameEn": "Rupganj",
    "nameBn": "রূপগঞ্জ",
    "type": "upazila",
    "districtId": "dist_43",
    "divisionId": "div_6"
  },
  {
    "id": "upa_332",
    "nameEn": "Sonargaon",
    "nameBn": "সোনারগাঁ",
    "type": "upazila",
    "districtId": "dist_43",
    "divisionId": "div_6"
  },
  {
    "id": "upa_333",
    "nameEn": "Basail",
    "nameBn": "বাসাইল",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_334",
    "nameEn": "Bhuapur",
    "nameBn": "ভুয়াপুর",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_335",
    "nameEn": "Delduar",
    "nameBn": "দেলদুয়ার",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_336",
    "nameEn": "Ghatail",
    "nameBn": "ঘাটাইল",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_337",
    "nameEn": "Gopalpur",
    "nameBn": "গোপালপুর",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_338",
    "nameEn": "Madhupur",
    "nameBn": "মধুপুর",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_339",
    "nameEn": "Mirzapur",
    "nameBn": "মির্জাপুর",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_340",
    "nameEn": "Nagarpur",
    "nameBn": "নাগরপুর",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_341",
    "nameEn": "Sakhipur",
    "nameBn": "সখিপুর",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_342",
    "nameEn": "Tangail Sadar",
    "nameBn": "টাঙ্গাইল সদর",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_343",
    "nameEn": "Kalihati",
    "nameBn": "কালিহাতী",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_344",
    "nameEn": "Dhanbari",
    "nameBn": "ধনবাড়ী",
    "type": "upazila",
    "districtId": "dist_44",
    "divisionId": "div_6"
  },
  {
    "id": "upa_345",
    "nameEn": "Itna",
    "nameBn": "ইটনা",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_346",
    "nameEn": "Katiadi",
    "nameBn": "কটিয়াদী",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_347",
    "nameEn": "Bhairab",
    "nameBn": "ভৈরব",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_348",
    "nameEn": "Tarail",
    "nameBn": "তাড়াইল",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_349",
    "nameEn": "Hossainpur",
    "nameBn": "হোসেনপুর",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_350",
    "nameEn": "Pakundia",
    "nameBn": "পাকুন্দিয়া",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_351",
    "nameEn": "Kuliarchar",
    "nameBn": "কুলিয়ারচর",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_352",
    "nameEn": "Kishoreganj Sadar",
    "nameBn": "কিশোরগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_353",
    "nameEn": "Karimgonj",
    "nameBn": "করিমগঞ্জ",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_354",
    "nameEn": "Bajitpur",
    "nameBn": "বাজিতপুর",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_355",
    "nameEn": "Austagram",
    "nameBn": "অষ্টগ্রাম",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_356",
    "nameEn": "Mithamoin",
    "nameBn": "মিঠামইন",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_357",
    "nameEn": "Nikli",
    "nameBn": "নিকলী",
    "type": "upazila",
    "districtId": "dist_45",
    "divisionId": "div_6"
  },
  {
    "id": "upa_358",
    "nameEn": "Harirampur",
    "nameBn": "হরিরামপুর",
    "type": "upazila",
    "districtId": "dist_46",
    "divisionId": "div_6"
  },
  {
    "id": "upa_359",
    "nameEn": "Saturia",
    "nameBn": "সাটুরিয়া",
    "type": "upazila",
    "districtId": "dist_46",
    "divisionId": "div_6"
  },
  {
    "id": "upa_360",
    "nameEn": "Manikganj Sadar",
    "nameBn": "মানিকগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_46",
    "divisionId": "div_6"
  },
  {
    "id": "upa_361",
    "nameEn": "Gior",
    "nameBn": "ঘিওর",
    "type": "upazila",
    "districtId": "dist_46",
    "divisionId": "div_6"
  },
  {
    "id": "upa_362",
    "nameEn": "Shibaloy",
    "nameBn": "শিবালয়",
    "type": "upazila",
    "districtId": "dist_46",
    "divisionId": "div_6"
  },
  {
    "id": "upa_363",
    "nameEn": "Doulatpur",
    "nameBn": "দৌলতপুর",
    "type": "upazila",
    "districtId": "dist_46",
    "divisionId": "div_6"
  },
  {
    "id": "upa_364",
    "nameEn": "Singiar",
    "nameBn": "সিংগাইর",
    "type": "upazila",
    "districtId": "dist_46",
    "divisionId": "div_6"
  },
  {
    "id": "upa_365",
    "nameEn": "Savar",
    "nameBn": "সাভার",
    "type": "upazila",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "upa_366",
    "nameEn": "Dhamrai",
    "nameBn": "ধামরাই",
    "type": "upazila",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "upa_367",
    "nameEn": "Keraniganj",
    "nameBn": "কেরাণীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "upa_368",
    "nameEn": "Nawabganj",
    "nameBn": "নবাবগঞ্জ",
    "type": "upazila",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "upa_369",
    "nameEn": "Dohar",
    "nameBn": "দোহার",
    "type": "upazila",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "upa_370",
    "nameEn": "Munshiganj Sadar",
    "nameBn": "মুন্সিগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_48",
    "divisionId": "div_6"
  },
  {
    "id": "upa_371",
    "nameEn": "Sreenagar",
    "nameBn": "শ্রীনগর",
    "type": "upazila",
    "districtId": "dist_48",
    "divisionId": "div_6"
  },
  {
    "id": "upa_372",
    "nameEn": "Sirajdikhan",
    "nameBn": "সিরাজদিখান",
    "type": "upazila",
    "districtId": "dist_48",
    "divisionId": "div_6"
  },
  {
    "id": "upa_373",
    "nameEn": "Louhajanj",
    "nameBn": "লৌহজং",
    "type": "upazila",
    "districtId": "dist_48",
    "divisionId": "div_6"
  },
  {
    "id": "upa_374",
    "nameEn": "Gajaria",
    "nameBn": "গজারিয়া",
    "type": "upazila",
    "districtId": "dist_48",
    "divisionId": "div_6"
  },
  {
    "id": "upa_375",
    "nameEn": "Tongibari",
    "nameBn": "টংগীবাড়ি",
    "type": "upazila",
    "districtId": "dist_48",
    "divisionId": "div_6"
  },
  {
    "id": "upa_376",
    "nameEn": "Rajbari Sadar",
    "nameBn": "রাজবাড়ী সদর",
    "type": "upazila",
    "districtId": "dist_49",
    "divisionId": "div_6"
  },
  {
    "id": "upa_377",
    "nameEn": "Goalanda",
    "nameBn": "গোয়ালন্দ",
    "type": "upazila",
    "districtId": "dist_49",
    "divisionId": "div_6"
  },
  {
    "id": "upa_378",
    "nameEn": "Pangsa",
    "nameBn": "পাংশা",
    "type": "upazila",
    "districtId": "dist_49",
    "divisionId": "div_6"
  },
  {
    "id": "upa_379",
    "nameEn": "Baliakandi",
    "nameBn": "বালিয়াকান্দি",
    "type": "upazila",
    "districtId": "dist_49",
    "divisionId": "div_6"
  },
  {
    "id": "upa_380",
    "nameEn": "Kalukhali",
    "nameBn": "কালুখালী",
    "type": "upazila",
    "districtId": "dist_49",
    "divisionId": "div_6"
  },
  {
    "id": "upa_381",
    "nameEn": "Madaripur Sadar",
    "nameBn": "মাদারীপুর সদর",
    "type": "upazila",
    "districtId": "dist_50",
    "divisionId": "div_6"
  },
  {
    "id": "upa_382",
    "nameEn": "Shibchar",
    "nameBn": "শিবচর",
    "type": "upazila",
    "districtId": "dist_50",
    "divisionId": "div_6"
  },
  {
    "id": "upa_383",
    "nameEn": "Kalkini",
    "nameBn": "কালকিনি",
    "type": "upazila",
    "districtId": "dist_50",
    "divisionId": "div_6"
  },
  {
    "id": "upa_384",
    "nameEn": "Rajoir",
    "nameBn": "রাজৈর",
    "type": "upazila",
    "districtId": "dist_50",
    "divisionId": "div_6"
  },
  {
    "id": "upa_385",
    "nameEn": "Gopalganj Sadar",
    "nameBn": "গোপালগঞ্জ সদর",
    "type": "upazila",
    "districtId": "dist_51",
    "divisionId": "div_6"
  },
  {
    "id": "upa_386",
    "nameEn": "Kashiani",
    "nameBn": "কাশিয়ানী",
    "type": "upazila",
    "districtId": "dist_51",
    "divisionId": "div_6"
  },
  {
    "id": "upa_387",
    "nameEn": "Tungipara",
    "nameBn": "টুংগীপাড়া",
    "type": "upazila",
    "districtId": "dist_51",
    "divisionId": "div_6"
  },
  {
    "id": "upa_388",
    "nameEn": "Kotalipara",
    "nameBn": "কোটালীপাড়া",
    "type": "upazila",
    "districtId": "dist_51",
    "divisionId": "div_6"
  },
  {
    "id": "upa_389",
    "nameEn": "Muksudpur",
    "nameBn": "মুকসুদপুর",
    "type": "upazila",
    "districtId": "dist_51",
    "divisionId": "div_6"
  },
  {
    "id": "upa_390",
    "nameEn": "Faridpur Sadar",
    "nameBn": "ফরিদপুর সদর",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_391",
    "nameEn": "Alfadanga",
    "nameBn": "আলফাডাঙ্গা",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_392",
    "nameEn": "Boalmari",
    "nameBn": "বোয়ালমারী",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_393",
    "nameEn": "Sadarpur",
    "nameBn": "সদরপুর",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_394",
    "nameEn": "Nagarkanda",
    "nameBn": "নগরকান্দা",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_395",
    "nameEn": "Bhanga",
    "nameBn": "ভাঙ্গা",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_396",
    "nameEn": "Charbhadrasan",
    "nameBn": "চরভদ্রাসন",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_397",
    "nameEn": "Madhukhali",
    "nameBn": "মধুখালী",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_398",
    "nameEn": "Saltha",
    "nameBn": "সালথা",
    "type": "upazila",
    "districtId": "dist_52",
    "divisionId": "div_6"
  },
  {
    "id": "upa_399",
    "nameEn": "Panchagarh Sadar",
    "nameBn": "পঞ্চগড় সদর",
    "type": "upazila",
    "districtId": "dist_53",
    "divisionId": "div_7"
  },
  {
    "id": "upa_400",
    "nameEn": "Debiganj",
    "nameBn": "দেবীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_53",
    "divisionId": "div_7"
  },
  {
    "id": "upa_401",
    "nameEn": "Boda",
    "nameBn": "বোদা",
    "type": "upazila",
    "districtId": "dist_53",
    "divisionId": "div_7"
  },
  {
    "id": "upa_402",
    "nameEn": "Atwari",
    "nameBn": "আটোয়ারী",
    "type": "upazila",
    "districtId": "dist_53",
    "divisionId": "div_7"
  },
  {
    "id": "upa_403",
    "nameEn": "Tetulia",
    "nameBn": "তেতুলিয়া",
    "type": "upazila",
    "districtId": "dist_53",
    "divisionId": "div_7"
  },
  {
    "id": "upa_404",
    "nameEn": "Nawabganj",
    "nameBn": "নবাবগঞ্জ",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_405",
    "nameEn": "Birganj",
    "nameBn": "বীরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_406",
    "nameEn": "Ghoraghat",
    "nameBn": "ঘোড়াঘাট",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_407",
    "nameEn": "Birampur",
    "nameBn": "বিরামপুর",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_408",
    "nameEn": "Parbatipur",
    "nameBn": "পার্বতীপুর",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_409",
    "nameEn": "Bochaganj",
    "nameBn": "বোচাগঞ্জ",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_410",
    "nameEn": "Kaharol",
    "nameBn": "কাহারোল",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_411",
    "nameEn": "Fulbari",
    "nameBn": "ফুলবাড়ী",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_412",
    "nameEn": "Dinajpur Sadar",
    "nameBn": "দিনাজপুর সদর",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_413",
    "nameEn": "Hakimpur",
    "nameBn": "হাকিমপুর",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_414",
    "nameEn": "Khansama",
    "nameBn": "খানসামা",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_415",
    "nameEn": "Birol",
    "nameBn": "বিরল",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_416",
    "nameEn": "Chirirbandar",
    "nameBn": "চিরিরবন্দর",
    "type": "upazila",
    "districtId": "dist_54",
    "divisionId": "div_7"
  },
  {
    "id": "upa_417",
    "nameEn": "Lalmonirhat Sadar",
    "nameBn": "লালমনিরহাট সদর",
    "type": "upazila",
    "districtId": "dist_55",
    "divisionId": "div_7"
  },
  {
    "id": "upa_418",
    "nameEn": "Kaliganj",
    "nameBn": "কালীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_55",
    "divisionId": "div_7"
  },
  {
    "id": "upa_419",
    "nameEn": "Hatibandha",
    "nameBn": "হাতীবান্ধা",
    "type": "upazila",
    "districtId": "dist_55",
    "divisionId": "div_7"
  },
  {
    "id": "upa_420",
    "nameEn": "Patgram",
    "nameBn": "পাটগ্রাম",
    "type": "upazila",
    "districtId": "dist_55",
    "divisionId": "div_7"
  },
  {
    "id": "upa_421",
    "nameEn": "Aditmari",
    "nameBn": "আদিতমারী",
    "type": "upazila",
    "districtId": "dist_55",
    "divisionId": "div_7"
  },
  {
    "id": "upa_422",
    "nameEn": "Syedpur",
    "nameBn": "সৈয়দপুর",
    "type": "upazila",
    "districtId": "dist_56",
    "divisionId": "div_7"
  },
  {
    "id": "upa_423",
    "nameEn": "Domar",
    "nameBn": "ডোমার",
    "type": "upazila",
    "districtId": "dist_56",
    "divisionId": "div_7"
  },
  {
    "id": "upa_424",
    "nameEn": "Dimla",
    "nameBn": "ডিমলা",
    "type": "upazila",
    "districtId": "dist_56",
    "divisionId": "div_7"
  },
  {
    "id": "upa_425",
    "nameEn": "Jaldhaka",
    "nameBn": "জলঢাকা",
    "type": "upazila",
    "districtId": "dist_56",
    "divisionId": "div_7"
  },
  {
    "id": "upa_426",
    "nameEn": "Kishorganj",
    "nameBn": "কিশোরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_56",
    "divisionId": "div_7"
  },
  {
    "id": "upa_427",
    "nameEn": "Nilphamari Sadar",
    "nameBn": "নীলফামারী সদর",
    "type": "upazila",
    "districtId": "dist_56",
    "divisionId": "div_7"
  },
  {
    "id": "upa_428",
    "nameEn": "Sadullapur",
    "nameBn": "সাদুল্লাপুর",
    "type": "upazila",
    "districtId": "dist_57",
    "divisionId": "div_7"
  },
  {
    "id": "upa_429",
    "nameEn": "Gaibandha Sadar",
    "nameBn": "গাইবান্ধা সদর",
    "type": "upazila",
    "districtId": "dist_57",
    "divisionId": "div_7"
  },
  {
    "id": "upa_430",
    "nameEn": "Palashbari",
    "nameBn": "পলাশবাড়ী",
    "type": "upazila",
    "districtId": "dist_57",
    "divisionId": "div_7"
  },
  {
    "id": "upa_431",
    "nameEn": "Saghata",
    "nameBn": "সাঘাটা",
    "type": "upazila",
    "districtId": "dist_57",
    "divisionId": "div_7"
  },
  {
    "id": "upa_432",
    "nameEn": "Gobindaganj",
    "nameBn": "গোবিন্দগঞ্জ",
    "type": "upazila",
    "districtId": "dist_57",
    "divisionId": "div_7"
  },
  {
    "id": "upa_433",
    "nameEn": "Sundarganj",
    "nameBn": "সুন্দরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_57",
    "divisionId": "div_7"
  },
  {
    "id": "upa_434",
    "nameEn": "Phulchari",
    "nameBn": "ফুলছড়ি",
    "type": "upazila",
    "districtId": "dist_57",
    "divisionId": "div_7"
  },
  {
    "id": "upa_435",
    "nameEn": "Thakurgaon Sadar",
    "nameBn": "ঠাকুরগাঁও সদর",
    "type": "upazila",
    "districtId": "dist_58",
    "divisionId": "div_7"
  },
  {
    "id": "upa_436",
    "nameEn": "Pirganj",
    "nameBn": "পীরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_58",
    "divisionId": "div_7"
  },
  {
    "id": "upa_437",
    "nameEn": "Ranisankail",
    "nameBn": "রাণীশংকৈল",
    "type": "upazila",
    "districtId": "dist_58",
    "divisionId": "div_7"
  },
  {
    "id": "upa_438",
    "nameEn": "Haripur",
    "nameBn": "হরিপুর",
    "type": "upazila",
    "districtId": "dist_58",
    "divisionId": "div_7"
  },
  {
    "id": "upa_439",
    "nameEn": "Baliadangi",
    "nameBn": "বালিয়াডাঙ্গী",
    "type": "upazila",
    "districtId": "dist_58",
    "divisionId": "div_7"
  },
  {
    "id": "upa_440",
    "nameEn": "Rangpur Sadar",
    "nameBn": "রংপুর সদর",
    "type": "upazila",
    "districtId": "dist_59",
    "divisionId": "div_7"
  },
  {
    "id": "upa_441",
    "nameEn": "Gangachara",
    "nameBn": "গংগাচড়া",
    "type": "upazila",
    "districtId": "dist_59",
    "divisionId": "div_7"
  },
  {
    "id": "upa_442",
    "nameEn": "Taragonj",
    "nameBn": "তারাগঞ্জ",
    "type": "upazila",
    "districtId": "dist_59",
    "divisionId": "div_7"
  },
  {
    "id": "upa_443",
    "nameEn": "Badargonj",
    "nameBn": "বদরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_59",
    "divisionId": "div_7"
  },
  {
    "id": "upa_444",
    "nameEn": "Mithapukur",
    "nameBn": "মিঠাপুকুর",
    "type": "upazila",
    "districtId": "dist_59",
    "divisionId": "div_7"
  },
  {
    "id": "upa_445",
    "nameEn": "Pirgonj",
    "nameBn": "পীরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_59",
    "divisionId": "div_7"
  },
  {
    "id": "upa_446",
    "nameEn": "Kaunia",
    "nameBn": "কাউনিয়া",
    "type": "upazila",
    "districtId": "dist_59",
    "divisionId": "div_7"
  },
  {
    "id": "upa_447",
    "nameEn": "Pirgacha",
    "nameBn": "পীরগাছা",
    "type": "upazila",
    "districtId": "dist_59",
    "divisionId": "div_7"
  },
  {
    "id": "upa_448",
    "nameEn": "Kurigram Sadar",
    "nameBn": "কুড়িগ্রাম সদর",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_449",
    "nameEn": "Nageshwari",
    "nameBn": "নাগেশ্বরী",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_450",
    "nameEn": "Bhurungamari",
    "nameBn": "ভুরুঙ্গামারী",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_451",
    "nameEn": "Phulbari",
    "nameBn": "ফুলবাড়ী",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_452",
    "nameEn": "Rajarhat",
    "nameBn": "রাজারহাট",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_453",
    "nameEn": "Ulipur",
    "nameBn": "উলিপুর",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_454",
    "nameEn": "Chilmari",
    "nameBn": "চিলমারী",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_455",
    "nameEn": "Rowmari",
    "nameBn": "রৌমারী",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_456",
    "nameEn": "Charrajibpur",
    "nameBn": "চর রাজিবপুর",
    "type": "upazila",
    "districtId": "dist_60",
    "divisionId": "div_7"
  },
  {
    "id": "upa_457",
    "nameEn": "Sherpur Sadar",
    "nameBn": "শেরপুর সদর",
    "type": "upazila",
    "districtId": "dist_61",
    "divisionId": "div_8"
  },
  {
    "id": "upa_458",
    "nameEn": "Nalitabari",
    "nameBn": "নালিতাবাড়ী",
    "type": "upazila",
    "districtId": "dist_61",
    "divisionId": "div_8"
  },
  {
    "id": "upa_459",
    "nameEn": "Sreebordi",
    "nameBn": "শ্রীবরদী",
    "type": "upazila",
    "districtId": "dist_61",
    "divisionId": "div_8"
  },
  {
    "id": "upa_460",
    "nameEn": "Nokla",
    "nameBn": "নকলা",
    "type": "upazila",
    "districtId": "dist_61",
    "divisionId": "div_8"
  },
  {
    "id": "upa_461",
    "nameEn": "Jhenaigati",
    "nameBn": "ঝিনাইগাতী",
    "type": "upazila",
    "districtId": "dist_61",
    "divisionId": "div_8"
  },
  {
    "id": "upa_462",
    "nameEn": "Fulbaria",
    "nameBn": "ফুলবাড়ীয়া",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_463",
    "nameEn": "Trishal",
    "nameBn": "ত্রিশাল",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_464",
    "nameEn": "Bhaluka",
    "nameBn": "ভালুকা",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_465",
    "nameEn": "Muktagacha",
    "nameBn": "মুক্তাগাছা",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_466",
    "nameEn": "Mymensingh Sadar",
    "nameBn": "ময়মনসিংহ সদর",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_467",
    "nameEn": "Dhobaura",
    "nameBn": "ধোবাউড়া",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_468",
    "nameEn": "Phulpur",
    "nameBn": "ফুলপুর",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_469",
    "nameEn": "Haluaghat",
    "nameBn": "হালুয়াঘাট",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_470",
    "nameEn": "Gouripur",
    "nameBn": "গৌরীপুর",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_471",
    "nameEn": "Gafargaon",
    "nameBn": "গফরগাঁও",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_472",
    "nameEn": "Iswarganj",
    "nameBn": "ঈশ্বরগঞ্জ",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_473",
    "nameEn": "Nandail",
    "nameBn": "নান্দাইল",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_474",
    "nameEn": "Tarakanda",
    "nameBn": "তারাকান্দা",
    "type": "upazila",
    "districtId": "dist_62",
    "divisionId": "div_8"
  },
  {
    "id": "upa_475",
    "nameEn": "Jamalpur Sadar",
    "nameBn": "জামালপুর সদর",
    "type": "upazila",
    "districtId": "dist_63",
    "divisionId": "div_8"
  },
  {
    "id": "upa_476",
    "nameEn": "Melandah",
    "nameBn": "মেলান্দহ",
    "type": "upazila",
    "districtId": "dist_63",
    "divisionId": "div_8"
  },
  {
    "id": "upa_477",
    "nameEn": "Islampur",
    "nameBn": "ইসলামপুর",
    "type": "upazila",
    "districtId": "dist_63",
    "divisionId": "div_8"
  },
  {
    "id": "upa_478",
    "nameEn": "Dewangonj",
    "nameBn": "দেওয়ানগঞ্জ",
    "type": "upazila",
    "districtId": "dist_63",
    "divisionId": "div_8"
  },
  {
    "id": "upa_479",
    "nameEn": "Sarishabari",
    "nameBn": "সরিষাবাড়ী",
    "type": "upazila",
    "districtId": "dist_63",
    "divisionId": "div_8"
  },
  {
    "id": "upa_480",
    "nameEn": "Madarganj",
    "nameBn": "মাদারগঞ্জ",
    "type": "upazila",
    "districtId": "dist_63",
    "divisionId": "div_8"
  },
  {
    "id": "upa_481",
    "nameEn": "Bokshiganj",
    "nameBn": "বকশীগঞ্জ",
    "type": "upazila",
    "districtId": "dist_63",
    "divisionId": "div_8"
  },
  {
    "id": "upa_482",
    "nameEn": "Barhatta",
    "nameBn": "বারহাট্টা",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_483",
    "nameEn": "Durgapur",
    "nameBn": "দুর্গাপুর",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_484",
    "nameEn": "Kendua",
    "nameBn": "কেন্দুয়া",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_485",
    "nameEn": "Atpara",
    "nameBn": "আটপাড়া",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_486",
    "nameEn": "Madan",
    "nameBn": "মদন",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_487",
    "nameEn": "Khaliajuri",
    "nameBn": "খালিয়াজুরী",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_488",
    "nameEn": "Kalmakanda",
    "nameBn": "কলমাকান্দা",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_489",
    "nameEn": "Mohongonj",
    "nameBn": "মোহনগঞ্জ",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_490",
    "nameEn": "Purbadhala",
    "nameBn": "পূর্বধলা",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_491",
    "nameEn": "Netrokona Sadar",
    "nameBn": "নেত্রকোণা সদর",
    "type": "upazila",
    "districtId": "dist_64",
    "divisionId": "div_8"
  },
  {
    "id": "upa_492",
    "nameEn": "Eidgaon",
    "nameBn": "ঈদগাঁও",
    "type": "upazila",
    "districtId": "dist_9",
    "divisionId": "div_1"
  },
  {
    "id": "upa_493",
    "nameEn": "Madhyanagar",
    "nameBn": "মধ্যনগর",
    "type": "upazila",
    "districtId": "dist_39",
    "divisionId": "div_5"
  },
  {
    "id": "upa_494",
    "nameEn": "Dasar",
    "nameBn": "ডাসার",
    "type": "upazila",
    "districtId": "dist_50",
    "divisionId": "div_6"
  },
  {
    "id": "metro_0",
    "nameEn": "Dhanmondi",
    "nameBn": "ধানমন্ডি",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_1",
    "nameEn": "Gulshan",
    "nameBn": "গুলশান",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_2",
    "nameEn": "Mirpur",
    "nameBn": "মিরপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_3",
    "nameEn": "Uttara",
    "nameBn": "উত্তরা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_4",
    "nameEn": "Mohammadpur",
    "nameBn": "মোহাম্মদপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_5",
    "nameEn": "Banani",
    "nameBn": "বনানী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_6",
    "nameEn": "Motijheel",
    "nameBn": "মতিঝিল",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_7",
    "nameEn": "Tejgaon",
    "nameBn": "তেজগাঁও",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_8",
    "nameEn": "Badda",
    "nameBn": "বাড্ডা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_9",
    "nameEn": "Cantonment",
    "nameBn": "ক্যান্টনমেন্ট",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_10",
    "nameEn": "Demra",
    "nameBn": "ডেমরা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_11",
    "nameEn": "Hazaribagh",
    "nameBn": "হাজারীবাগ",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_12",
    "nameEn": "Kafrul",
    "nameBn": "কাফরুল",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_13",
    "nameEn": "Kamrangirchar",
    "nameBn": "কামরাঙ্গীরচর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_14",
    "nameEn": "Khilgaon",
    "nameBn": "খিলগাঁও",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_15",
    "nameEn": "Kotwali",
    "nameBn": "কোতোয়ালী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_16",
    "nameEn": "Lalbagh",
    "nameBn": "লালবাগ",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_17",
    "nameEn": "Pallabi",
    "nameBn": "পল্লবী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_18",
    "nameEn": "Paltan",
    "nameBn": "পল্টন",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_19",
    "nameEn": "Ramna",
    "nameBn": "রমনা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_20",
    "nameEn": "Sabujbagh",
    "nameBn": "সবুজবাগ",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_21",
    "nameEn": "Sutrapur",
    "nameBn": "সূত্রাপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_22",
    "nameEn": "Tejgaon Industrial Area",
    "nameBn": "তেজগাঁও শিল্পাঞ্চল",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_23",
    "nameEn": "Turag",
    "nameBn": "তুরাগ",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_24",
    "nameEn": "Uttar Khan",
    "nameBn": "উত্তর খান",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_25",
    "nameEn": "Dakshinkhan",
    "nameBn": "দক্ষিণখান",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_26",
    "nameEn": "Vatara",
    "nameBn": "ভাটারা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_27",
    "nameEn": "Shahbagh",
    "nameBn": "শাহবাগ",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_28",
    "nameEn": "Sher-e-Bangla Nagar",
    "nameBn": "শেরেবাংলা নগর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_29",
    "nameEn": "Khilkhet",
    "nameBn": "খিলক্ষেত",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_30",
    "nameEn": "Rampura",
    "nameBn": "রামপুরা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_31",
    "nameEn": "Kadamtali",
    "nameBn": "কদমতলী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_32",
    "nameEn": "Shyampur",
    "nameBn": "শ্যামপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_33",
    "nameEn": "New Market",
    "nameBn": "নিউ মার্কেট",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_34",
    "nameEn": "Adabor",
    "nameBn": "আদাবর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_35",
    "nameEn": "Darussalam",
    "nameBn": "দারুসসালাম",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_36",
    "nameEn": "Shah Ali",
    "nameBn": "শাহ আলী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_37",
    "nameEn": "Panchlaish",
    "nameBn": "পাঁচলাইশ",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_38",
    "nameEn": "Double Mooring",
    "nameBn": "ডবলমুরিং",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_39",
    "nameEn": "Kotwali",
    "nameBn": "কোতোয়ালী",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_40",
    "nameEn": "Pahartali",
    "nameBn": "পাহাড়তলী",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_41",
    "nameEn": "Bandar",
    "nameBn": "বন্দর",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_42",
    "nameEn": "Chandgaon",
    "nameBn": "চান্দগাঁও",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_43",
    "nameEn": "Bakalia",
    "nameBn": "বাকলিয়া",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_44",
    "nameEn": "Patenga",
    "nameBn": "পতেঙ্গা",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_45",
    "nameEn": "Bayazid",
    "nameBn": "বায়েজিদ",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_46",
    "nameEn": "Halishahar",
    "nameBn": "হালিশহর",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_47",
    "nameEn": "Boalia",
    "nameBn": "বোয়ালিয়া",
    "type": "area",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "metro_48",
    "nameEn": "Motihar",
    "nameBn": "মতিহার",
    "type": "area",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "metro_49",
    "nameEn": "Rajpara",
    "nameBn": "রাজপাড়া",
    "type": "area",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "metro_50",
    "nameEn": "Shah Mokhdum",
    "nameBn": "শাহ মখদুম",
    "type": "area",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "metro_51",
    "nameEn": "Khulna Sadar",
    "nameBn": "খুলনা সদর",
    "type": "area",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "metro_52",
    "nameEn": "Daulatpur",
    "nameBn": "দৌলতপুর",
    "type": "area",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "metro_53",
    "nameEn": "Khalishpur",
    "nameBn": "খালিশপুর",
    "type": "area",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "metro_54",
    "nameEn": "Khan Jahan Ali",
    "nameBn": "খান জাহান আলী",
    "type": "area",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "metro_55",
    "nameEn": "Barishal Sadar",
    "nameBn": "বরিশাল সদর",
    "type": "area",
    "districtId": "",
    "divisionId": ""
  },
  {
    "id": "metro_57",
    "nameEn": "Dakshin Surma",
    "nameBn": "দক্ষিণ সুরমা",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_58",
    "nameEn": "Karwan Bazar",
    "nameBn": "কারওয়ান বাজার",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_59",
    "nameEn": "Mohakhali",
    "nameBn": "মহাখালী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_60",
    "nameEn": "Farmgate",
    "nameBn": "ফার্মগেট",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_61",
    "nameEn": "Malibagh",
    "nameBn": "মালিবাগ",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_62",
    "nameEn": "Moghbazar",
    "nameBn": "মগবাজার",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_63",
    "nameEn": "Shantinagar",
    "nameBn": "শান্তিনগর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_64",
    "nameEn": "Kakrail",
    "nameBn": "কাকরাইল",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_65",
    "nameEn": "Bailey Road",
    "nameBn": "বেইলি রোড",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_66",
    "nameEn": "Elephant Road",
    "nameBn": "এলিফ্যান্ট রোড",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_67",
    "nameEn": "Jatrabari",
    "nameBn": "যাত্রাবাড়ী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_68",
    "nameEn": "Wari",
    "nameBn": "ওয়ারী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_69",
    "nameEn": "Banasree",
    "nameBn": "বনশ্রী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_70",
    "nameEn": "Bashundhara",
    "nameBn": "বসুন্ধরা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_71",
    "nameEn": "Aftabnagar",
    "nameBn": "আফতাবনগর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_72",
    "nameEn": "Niketon",
    "nameBn": "নিকেতন",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_73",
    "nameEn": "Baridhara",
    "nameBn": "বারিধারা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_74",
    "nameEn": "Kuril",
    "nameBn": "কুড়িল",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_75",
    "nameEn": "Diabari",
    "nameBn": "দিয়াবাড়ী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_76",
    "nameEn": "Agargaon",
    "nameBn": "আগারগাঁও",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_77",
    "nameEn": "Kalyanpur",
    "nameBn": "কল্যাণপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_78",
    "nameEn": "Shyamoli",
    "nameBn": "শ্যামলী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_79",
    "nameEn": "Taltola",
    "nameBn": "তালতলা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_80",
    "nameEn": "Bosila",
    "nameBn": "বসিলা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_81",
    "nameEn": "Rayerbazar",
    "nameBn": "রায়েরবাজার",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_82",
    "nameEn": "Mugda",
    "nameBn": "মুগদা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_83",
    "nameEn": "Basabo",
    "nameBn": "বাসাবো",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_84",
    "nameEn": "Goran",
    "nameBn": "গোরান",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_85",
    "nameEn": "Khulshi",
    "nameBn": "খুলশী",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_86",
    "nameEn": "Agrabad",
    "nameBn": "আগ্রাবাদ",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_87",
    "nameEn": "Nasirabad",
    "nameBn": "নাসিরাবাদ",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_88",
    "nameEn": "Chawkbazar",
    "nameBn": "চকবাজার",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_89",
    "nameEn": "EPZ",
    "nameBn": "ইপিজেড",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_90",
    "nameEn": "GEC",
    "nameBn": "জিইসি",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_91",
    "nameEn": "Jalalabad",
    "nameBn": "জালালাবাদ",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_92",
    "nameEn": "Mogla Bazar",
    "nameBn": "মোগলা বাজার",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_93",
    "nameEn": "Shahparan",
    "nameBn": "শাহপরাণ",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_94",
    "nameEn": "Zindabazar",
    "nameBn": "জিন্দাবাজার",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_95",
    "nameEn": "Bandarbazar",
    "nameBn": "বন্দরবাজার",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_96",
    "nameEn": "Amberkhana",
    "nameBn": "আম্বরখানা",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_97",
    "nameEn": "Uposhahar",
    "nameBn": "উপশহর",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_98",
    "nameEn": "Shah Makhdum",
    "nameBn": "শাহ মখদুম",
    "type": "area",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "metro_99",
    "nameEn": "Chandrima",
    "nameBn": "চন্দ্রিমা",
    "type": "area",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "metro_100",
    "nameEn": "Kasiadanga",
    "nameBn": "কাশিয়াডাঙ্গা",
    "type": "area",
    "districtId": "dist_15",
    "divisionId": "div_2"
  },
  {
    "id": "metro_101",
    "nameEn": "Sonadanga",
    "nameBn": "সোনাডাঙ্গা",
    "type": "area",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "metro_102",
    "nameEn": "Aranghata",
    "nameBn": "আড়ংঘাটা",
    "type": "area",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "metro_103",
    "nameEn": "Harintana",
    "nameBn": "হরিণটানা",
    "type": "area",
    "districtId": "dist_27",
    "divisionId": "div_3"
  },
  {
    "id": "metro_104",
    "nameEn": "Ashulia",
    "nameBn": "আশুলিয়া",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_105",
    "nameEn": "Bimanbandar",
    "nameBn": "বিমানবন্দর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_106",
    "nameEn": "Gendaria",
    "nameBn": "গেন্ডারিয়া",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_107",
    "nameEn": "Chawkbazar",
    "nameBn": "চকবাজার",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_108",
    "nameEn": "Bhashantek",
    "nameBn": "ভাষানটেক",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_109",
    "nameEn": "Bhatara",
    "nameBn": "ভাটারা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_110",
    "nameEn": "Banani DOHS",
    "nameBn": "বনানী ডিওএইচএস",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_111",
    "nameEn": "Mirpur DOHS",
    "nameBn": "মিরপুর ডিওএইচএস",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_112",
    "nameEn": "Mohakhali DOHS",
    "nameBn": "মহাখালী ডিওএইচএস",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_113",
    "nameEn": "Baridhara DOHS",
    "nameBn": "বারিধারা ডিওএইচএস",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_114",
    "nameEn": "Zigatola",
    "nameBn": "জিগাতলা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_115",
    "nameEn": "Hatirjheel",
    "nameBn": "হাতিরঝিল",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_116",
    "nameEn": "Kallyanpur",
    "nameBn": "কল্যাণপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_117",
    "nameEn": "Beraid",
    "nameBn": "বেরাইদ",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_118",
    "nameEn": "Dakshinkhan",
    "nameBn": "দক্ষিণখান",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_119",
    "nameEn": "Uttarkhan",
    "nameBn": "উত্তরখান",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_120",
    "nameEn": "Rupnagar",
    "nameBn": "রূপনগর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_121",
    "nameEn": "Badda Link Road",
    "nameBn": "বাড্ডা লিংক রোড",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_122",
    "nameEn": "Merul Badda",
    "nameBn": "মেরুল বাড্ডা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_123",
    "nameEn": "Uttar Badda",
    "nameBn": "উত্তর বাড্ডা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_124",
    "nameEn": "Middle Badda",
    "nameBn": "মধ্য বাড্ডা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_125",
    "nameEn": "Shahjadpur",
    "nameBn": "শাহজাদপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_126",
    "nameEn": "Joar Sahara",
    "nameBn": "জোয়ার সাহারা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_127",
    "nameEn": "Kuratoli",
    "nameBn": "কুড়াতলী",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_128",
    "nameEn": "Shewrapara",
    "nameBn": "শেওড়াপাড়া",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_129",
    "nameEn": "Kazipara",
    "nameBn": "কাজীপাড়া",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_130",
    "nameEn": "Taltola",
    "nameBn": "তালতলা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_131",
    "nameEn": "Mugdapara",
    "nameBn": "মুগদাপাড়া",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_132",
    "nameEn": "Maniknagar",
    "nameBn": "মানিকনগর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_133",
    "nameEn": "Sayedabad",
    "nameBn": "সায়েদাবাদ",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_134",
    "nameEn": "Dolaikhal",
    "nameBn": "ধোলাইখাল",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_135",
    "nameEn": "Gulisthan",
    "nameBn": "গুলিস্তান",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_136",
    "nameEn": "Nawabpur",
    "nameBn": "নবাবপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_137",
    "nameEn": "Azimpur",
    "nameBn": "আজিমপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_138",
    "nameEn": "Bangshal",
    "nameBn": "বংশাল",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_139",
    "nameEn": "Islampur",
    "nameBn": "ইসলামপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_140",
    "nameEn": "Sadarghat",
    "nameBn": "সদরঘাট",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_141",
    "nameEn": "Jurain",
    "nameBn": "জুরাইন",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_142",
    "nameEn": "Postagola",
    "nameBn": "পোস্তগোলা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_143",
    "nameEn": "Ashkona",
    "nameBn": "আশকোনা",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_144",
    "nameEn": "Abdullahpur",
    "nameBn": "আব্দুল্লাহপুর",
    "type": "area",
    "districtId": "dist_47",
    "divisionId": "div_6"
  },
  {
    "id": "metro_145",
    "nameEn": "Dakshin Surma",
    "nameBn": "দক্ষিণ সুরমা",
    "type": "area",
    "districtId": "dist_36",
    "divisionId": "div_5"
  },
  {
    "id": "metro_146",
    "nameEn": "Hathazari",
    "nameBn": "হাটহাজারী",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  },
  {
    "id": "metro_147",
    "nameEn": "Sitakunda",
    "nameBn": "সীতাকুন্ড",
    "type": "area",
    "districtId": "dist_8",
    "divisionId": "div_1"
  }
];

export const allLocations: LocationNode[] = [
  ...divisions,
  ...districts,
  ...upazilas
];
