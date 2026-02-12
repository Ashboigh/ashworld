import type { WorkflowTemplate } from "./amalena";

export const AMALENA_PLUGIN_TEMPLATE: WorkflowTemplate = {
  "name": "Amalena Support Flow",
  "description": "Welcome to **Amalena Support**! I'm here to help you with your orders, products, and account. How can I assist you today?",
  "triggerType": "conversation_start",
  "isDefault": true,
  "nodes": [
    {
      "nodeId": "workflow_start",
      "type": "start",
      "positionX": 20,
      "positionY": 80,
      "config": {}
    },
    {
      "nodeId": "main_menu",
      "type": "buttons",
      "positionX": 180,
      "positionY": 80,
      "config": {
        "message": "What can I help you with today?",
        "buttons": [
          {
            "label": "Track My Order",
            "value": "order_tracking"
          },
          {
            "label": "Place an Order",
            "value": "order_start"
          },
          {
            "label": "Product Inquiry",
            "value": "product_menu"
          },
          {
            "label": "Returns & Refunds",
            "value": "returns_menu"
          },
          {
            "label": "Store & Website Info",
            "value": "info_menu"
          },
          {
            "label": "Pregnancy & Birth Prep",
            "value": "pregnancy_disclaimer"
          },
          {
            "label": "File a Complaint",
            "value": "complaint_menu"
          },
          {
            "label": "Account & Billing",
            "value": "account_menu"
          }
        ]
      }
    },
    {
      "nodeId": "order_start",
      "type": "condition",
      "positionX": 400,
      "positionY": 80,
      "config": {
        "variable": "user.isLoggedIn",
        "operator": "equals",
        "value": true
      }
    },
    {
      "nodeId": "order_login_prompt",
      "type": "send_message",
      "positionX": 620,
      "positionY": 80,
      "config": {
        "message": "To place an order, please log in to your account."
      }
    },
    {
      "nodeId": "order_product_search",
      "type": "capture_input",
      "positionX": 840,
      "positionY": 80,
      "config": {
        "prompt": "What would you like to order? Enter a product name or code:",
        "variable": "order_product_query",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "order_product_results",
      "type": "api_call",
      "positionX": 180,
      "positionY": 220,
      "config": {
        "message": "Here are matching products from our online store. Tap \"Add to order\" to build your cart.",
        "method": "GET",
        "url": "/api/shop/search?query=order_product_query",
        "outputVariable": "apiResults",
        "config": {
          "id": "order_product_results",
          "type": "product_lookup",
          "message": "Here are matching products from our online store. Tap \"Add to order\" to build your cart.",
          "query_field": "order_product_query",
          "limit": 4,
          "empty_message": "I could not find that product in our online catalog.",
          "show_cart_actions": true,
          "buttons": [
            {
              "label": "Search another product",
              "next": "order_product_search"
            },
            {
              "label": "Back to Main Menu",
              "next": "start"
            }
          ]
        }
      }
    },
    {
      "nodeId": "info_menu",
      "type": "buttons",
      "positionX": 400,
      "positionY": 220,
      "config": {
        "message": "Quick links to store and website information:",
        "buttons": [
          {
            "label": "About Us",
            "value": "info_about"
          },
          {
            "label": "Contact Us",
            "value": "info_contact"
          },
          {
            "label": "Delivery & Shipping",
            "value": "info_delivery"
          },
          {
            "label": "Return & Exchange Policy",
            "value": "info_returns_policy"
          },
          {
            "label": "Store Locations",
            "value": "store_locations"
          },
          {
            "label": "Privacy Policy",
            "value": "info_privacy"
          },
          {
            "label": "Customer Service",
            "value": "info_customer_service"
          },
          {
            "label": "Blog",
            "value": "info_blog"
          },
          {
            "label": "Social Links",
            "value": "info_social"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "info_about",
      "type": "send_message",
      "positionX": 620,
      "positionY": 220,
      "config": {
        "message": "Get to know Amalena and how we serve our customers:"
      }
    },
    {
      "nodeId": "info_contact",
      "type": "send_message",
      "positionX": 840,
      "positionY": 220,
      "config": {
        "message": "Here is the best way to reach us:"
      }
    },
    {
      "nodeId": "info_delivery",
      "type": "send_message",
      "positionX": 180,
      "positionY": 360,
      "config": {
        "message": "Delivery and shipping details:"
      }
    },
    {
      "nodeId": "info_returns_policy",
      "type": "send_message",
      "positionX": 400,
      "positionY": 360,
      "config": {
        "message": "Return and exchange policy overview:"
      }
    },
    {
      "nodeId": "info_privacy",
      "type": "send_message",
      "positionX": 620,
      "positionY": 360,
      "config": {
        "message": "Your privacy matters to us:"
      }
    },
    {
      "nodeId": "info_customer_service",
      "type": "send_message",
      "positionX": 840,
      "positionY": 360,
      "config": {
        "message": "Customer service resources:"
      }
    },
    {
      "nodeId": "info_blog",
      "type": "send_message",
      "positionX": 180,
      "positionY": 500,
      "config": {
        "message": "Catch up on our latest updates and tips:"
      }
    },
    {
      "nodeId": "info_social",
      "type": "buttons",
      "positionX": 400,
      "positionY": 500,
      "config": {
        "message": "Follow us on social media for updates: <a href=\"https://facebook.com\" target=\"_blank\" rel=\"noopener\">Facebook</a> | <a href=\"https://instagram.com\" target=\"_blank\" rel=\"noopener\">Instagram</a> | <a href=\"https://x.com\" target=\"_blank\" rel=\"noopener\">X</a> | <a href=\"https://tiktok.com\" target=\"_blank\" rel=\"noopener\">TikTok</a>",
        "buttons": [
          {
            "label": "Back to Info Menu",
            "value": "info_menu"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "pregnancy_disclaimer",
      "type": "send_message",
      "positionX": 620,
      "positionY": 500,
      "config": {
        "message": "Quick note: This guidance is based on reliable sources and general best practices. It is not medical advice. Please follow your midwife/doctor or Ghana Health Service for personal care."
      }
    },
    {
      "nodeId": "pregnancy_menu",
      "type": "buttons",
      "positionX": 840,
      "positionY": 500,
      "config": {
        "message": "How can I help with pregnancy and birth preparation?",
        "buttons": [
          {
            "label": "Best practices during pregnancy",
            "value": "pregnancy_best_practices"
          },
          {
            "label": "Danger signs to watch",
            "value": "pregnancy_warning_signs"
          },
          {
            "label": "Delivery preparation checklist",
            "value": "delivery_checklist_intro"
          },
          {
            "label": "Shop essentials",
            "value": "pregnancy_shop_menu"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "pregnancy_best_practices",
      "type": "buttons",
      "positionX": 180,
      "positionY": 640,
      "config": {
        "message": "Best practices for pregnancy (Ghana):\n- Attend all ANC visits and follow your provider's advice.\n- Eat balanced meals, stay hydrated, and take supplements as prescribed (such as iron/folate).\n- Rest well and do safe activity only if approved by your provider.\n- Avoid alcohol, smoking, and unprescribed medicines or herbal remedies.\n- Plan your delivery early: facility, transport, support person, and emergency contacts.\n- Learn danger signs and seek care quickly if they appear.\n\nWant to read more from trusted sources?",
        "buttons": [
          {
            "label": "UNICEF maternal health",
            "value": "preg_source_unicef"
          },
          {
            "label": "Childbirth video series",
            "value": "preg_source_ghm"
          },
          {
            "label": "AMREF maternal health",
            "value": "preg_source_amref"
          },
          {
            "label": "Mammy Health tips",
            "value": "preg_source_mammy"
          },
          {
            "label": "HelpMum resources",
            "value": "preg_source_helpmum"
          },
          {
            "label": "Back to Pregnancy Menu",
            "value": "pregnancy_menu"
          }
        ]
      }
    },
    {
      "nodeId": "preg_source_unicef",
      "type": "send_message",
      "positionX": 400,
      "positionY": 640,
      "config": {
        "message": "UNICEF guidance on maternal and newborn health:"
      }
    },
    {
      "nodeId": "preg_source_ghm",
      "type": "send_message",
      "positionX": 620,
      "positionY": 640,
      "config": {
        "message": "Global Health Media childbirth education:"
      }
    },
    {
      "nodeId": "preg_source_amref",
      "type": "send_message",
      "positionX": 840,
      "positionY": 640,
      "config": {
        "message": "AMREF maternal and child health:"
      }
    },
    {
      "nodeId": "preg_source_mammy",
      "type": "send_message",
      "positionX": 180,
      "positionY": 780,
      "config": {
        "message": "Mammy Health resources:"
      }
    },
    {
      "nodeId": "preg_source_helpmum",
      "type": "send_message",
      "positionX": 400,
      "positionY": 780,
      "config": {
        "message": "HelpMum resources for mothers:"
      }
    },
    {
      "nodeId": "pregnancy_warning_signs",
      "type": "buttons",
      "positionX": 620,
      "positionY": 780,
      "config": {
        "message": "Seek urgent care if you notice any of these:\n- Heavy bleeding or severe abdominal pain\n- Severe headache, blurred vision, or swelling of face/hands\n- Fever, chills, or foul-smelling discharge\n- Leaking fluid before labor\n- Baby is moving less than usual\n- Seizures or loss of consciousness\n\nIf any danger sign appears, go to the nearest health facility right away.",
        "buttons": [
          {
            "label": "Back to Pregnancy Menu",
            "value": "pregnancy_menu"
          },
          {
            "label": "Talk to an agent",
            "value": "collect_info"
          }
        ]
      }
    },
    {
      "nodeId": "delivery_checklist_intro",
      "type": "buttons",
      "positionX": 840,
      "positionY": 780,
      "config": {
        "message": "Delivery preparation checklist (Ghana).\nPlease confirm with your health facility because requirements vary.\nChoose a section to view.",
        "buttons": [
          {
            "label": "Mother's preparation",
            "value": "checklist_mother_prep"
          },
          {
            "label": "Baby's preparation",
            "value": "checklist_baby_prep"
          },
          {
            "label": "Delivery & hospital supplies",
            "value": "checklist_delivery_supplies"
          },
          {
            "label": "Birth planning & support",
            "value": "checklist_birth_planning"
          },
          {
            "label": "Important health messages",
            "value": "checklist_health_messages"
          },
          {
            "label": "Shop essentials",
            "value": "pregnancy_shop_menu"
          },
          {
            "label": "Back to Pregnancy Menu",
            "value": "pregnancy_menu"
          }
        ]
      }
    },
    {
      "nodeId": "checklist_mother_prep",
      "type": "buttons",
      "positionX": 180,
      "positionY": 920,
      "config": {
        "message": "Mother's preparation:\nMedical & administrative items:\n- ANC card or medical records\n- National ID or hospital registration documents\n- Health insurance card (if applicable)\n- Referral letter (if any)\n- Emergency contact details\n\nMother's clothing:\n- 2-3 loose maternity gowns or dresses\n- Sweater or shawl\n- Slippers or flat shoes\n- Socks\n- Cotton underwear (3-5 pairs)\n- Nursing bras\n\nMother's hygiene items:\n- Bath soap\n- Toothbrush and toothpaste\n- Towel\n- Tissue paper\n- Sanitary or maternity pads\n- Sanitary wipes\n- Body lotion or petroleum jelly\n\nNutrition & comfort:\n- Drinking water\n- Light snacks (as allowed by hospital)\n- Cup or bottle\n- Phone and charger\n- Small amount of emergency money",
        "buttons": [
          {
            "label": "Back to checklist",
            "value": "delivery_checklist_intro"
          },
          {
            "label": "Shop essentials",
            "value": "pregnancy_shop_menu"
          }
        ]
      }
    },
    {
      "nodeId": "checklist_baby_prep",
      "type": "buttons",
      "positionX": 400,
      "positionY": 920,
      "config": {
        "message": "Baby's preparation:\nBaby clothing (newborn size):\n- 2-3 welcome dresses or bodysuits\n- 2 sleepers or rompers\n- Socks (2-3 pairs)\n- Mittens\n- Caps (1-2)\n- Warm sweater or jacket (weather dependent)\n\nWarmth & bedding:\n- Baby blanket (thick and or light)\n- Receiving cloth or wrapper\n- Soft towels (1-2)\n\nBaby hygiene & care:\n- Newborn diapers\n- Cotton wool\n- Baby wipes\n- Mild baby soap\n- Baby oil or petroleum jelly\n- Small basin (if required)\n- Savlon (if advised)\n\nFeeding & health:\n- Breastfeeding support (initiate immediately after birth)\n- Feeding cup or bottle (only if medically advised)\n- Burp cloths\n- Baby health card or immunization booklet (issued at hospital)",
        "buttons": [
          {
            "label": "Back to checklist",
            "value": "delivery_checklist_intro"
          },
          {
            "label": "Shop essentials",
            "value": "pregnancy_shop_menu"
          }
        ]
      }
    },
    {
      "nodeId": "checklist_delivery_supplies",
      "type": "buttons",
      "positionX": 620,
      "positionY": 920,
      "config": {
        "message": "Delivery & hospital supplies (confirm with your facility):\n- Plastic sheet (mackintosh) or bed mats\n- Surgical gloves\n- Umbilical cord ties or clamp (if required)\n- Clean basin",
        "buttons": [
          {
            "label": "Back to checklist",
            "value": "delivery_checklist_intro"
          },
          {
            "label": "Back to Pregnancy Menu",
            "value": "pregnancy_menu"
          }
        ]
      }
    },
    {
      "nodeId": "checklist_birth_planning",
      "type": "buttons",
      "positionX": 840,
      "positionY": 920,
      "config": {
        "message": "Birth planning & support:\n- Chosen health facility for delivery\n- Transport plan (day and night)\n- Identified birth companion\n- Care plan for other children at home\n- Knowledge of labor danger signs",
        "buttons": [
          {
            "label": "Back to checklist",
            "value": "delivery_checklist_intro"
          },
          {
            "label": "Back to Pregnancy Menu",
            "value": "pregnancy_menu"
          }
        ]
      }
    },
    {
      "nodeId": "checklist_health_messages",
      "type": "buttons",
      "positionX": 180,
      "positionY": 1060,
      "config": {
        "message": "Important health messages:\n- Attend all antenatal clinic visits\n- Go to the hospital immediately when labor starts or if danger signs appear\n- Practice skin-to-skin contact after birth\n- Keep the baby warm at all times\n- Do not apply substances to the umbilical cord unless advised by a health worker",
        "buttons": [
          {
            "label": "Back to checklist",
            "value": "delivery_checklist_intro"
          },
          {
            "label": "Back to Pregnancy Menu",
            "value": "pregnancy_menu"
          }
        ]
      }
    },
    {
      "nodeId": "pregnancy_shop_menu",
      "type": "buttons",
      "positionX": 400,
      "positionY": 1060,
      "config": {
        "message": "What would you like to shop for?",
        "buttons": [
          {
            "label": "Mother essentials",
            "value": "pregnancy_shop_mother"
          },
          {
            "label": "Baby essentials",
            "value": "pregnancy_shop_baby"
          },
          {
            "label": "Search any item",
            "value": "pregnancy_shop_search"
          },
          {
            "label": "Back to Pregnancy Menu",
            "value": "pregnancy_menu"
          }
        ]
      }
    },
    {
      "nodeId": "pregnancy_shop_mother",
      "type": "buttons",
      "positionX": 620,
      "positionY": 1060,
      "config": {
        "message": "Choose a mother item to search in our store:",
        "buttons": [
          {
            "label": "Maternity pads",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Nursing bras",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Maternity gown",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Sanitary wipes",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Body lotion",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Petroleum jelly",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Back",
            "value": "pregnancy_shop_menu"
          }
        ]
      }
    },
    {
      "nodeId": "pregnancy_shop_baby",
      "type": "buttons",
      "positionX": 840,
      "positionY": 1060,
      "config": {
        "message": "Choose a baby item to search in our store:",
        "buttons": [
          {
            "label": "Newborn diapers",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Baby wipes",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Baby soap",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Baby oil",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Baby blanket",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Receiving cloth",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Baby cap",
            "value": "pregnancy_shop_results"
          },
          {
            "label": "Back",
            "value": "pregnancy_shop_menu"
          }
        ]
      }
    },
    {
      "nodeId": "pregnancy_shop_search",
      "type": "capture_input",
      "positionX": 180,
      "positionY": 1200,
      "config": {
        "prompt": "Type the item you want to find:",
        "variable": "pregnancy_product_query",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "pregnancy_shop_results",
      "type": "api_call",
      "positionX": 400,
      "positionY": 1200,
      "config": {
        "message": "Here are matching items from our store:",
        "method": "GET",
        "url": "/api/shop/search?query=pregnancy_product_query",
        "outputVariable": "apiResults",
        "config": {
          "id": "pregnancy_shop_results",
          "type": "product_lookup",
          "message": "Here are matching items from our store:",
          "query_field": "pregnancy_product_query",
          "limit": 4,
          "empty_message": "I could not find that item in our store.",
          "show_cart_actions": true,
          "buttons": [
            {
              "label": "Search another item",
              "next": "pregnancy_shop_search"
            },
            {
              "label": "Shop menu",
              "next": "pregnancy_shop_menu"
            },
            {
              "label": "Back to Pregnancy Menu",
              "next": "pregnancy_menu"
            }
          ]
        }
      }
    },
    {
      "nodeId": "order_tracking",
      "type": "buttons",
      "positionX": 620,
      "positionY": 1200,
      "config": {
        "message": "I can help you track your order. Do you have your order number?",
        "buttons": [
          {
            "label": "Yes, I have it",
            "value": "enter_order_number"
          },
          {
            "label": "No, help me find it",
            "value": "find_order"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "enter_order_number",
      "type": "capture_input",
      "positionX": 840,
      "positionY": 1200,
      "config": {
        "prompt": "Please enter your order number (e.g., #12345):",
        "variable": "order_number",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "order_status_check",
      "type": "buttons",
      "positionX": 180,
      "positionY": 1340,
      "config": {
        "message": "Let me check that order for you. What would you like to know?",
        "buttons": [
          {
            "label": "Where is my package?",
            "value": "package_location"
          },
          {
            "label": "Change delivery address",
            "value": "change_address"
          },
          {
            "label": "Cancel this order",
            "value": "cancel_order"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "find_order",
      "type": "capture_input",
      "positionX": 400,
      "positionY": 1340,
      "config": {
        "prompt": "No problem! I can look up your order using your email or phone number:",
        "variable": "customer_email",
        "validation": "email",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "order_lookup_result",
      "type": "buttons",
      "positionX": 620,
      "positionY": 1340,
      "config": {
        "message": "I found your recent orders. What would you like help with?",
        "buttons": [
          {
            "label": "Track latest order",
            "value": "package_location"
          },
          {
            "label": "View order history",
            "value": "order_history_info"
          },
          {
            "label": "I need something else",
            "value": "collect_info"
          }
        ]
      }
    },
    {
      "nodeId": "package_location",
      "type": "send_message",
      "positionX": 840,
      "positionY": 1340,
      "config": {
        "message": "Here's how to track your package:"
      }
    },
    {
      "nodeId": "delayed_package",
      "type": "buttons",
      "positionX": 180,
      "positionY": 1480,
      "config": {
        "message": "I'm sorry your package is delayed. Delays can happen due to high demand or logistics issues. Would you like to:",
        "buttons": [
          {
            "label": "Get estimated new delivery date",
            "value": "new_delivery_estimate"
          },
          {
            "label": "Request priority handling",
            "value": "priority_escalation"
          },
          {
            "label": "Cancel and get refund",
            "value": "cancel_refund"
          }
        ]
      }
    },
    {
      "nodeId": "missing_package",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 1480,
      "config": {
        "message": "I'm sorry to hear your package shows delivered but you haven't received it. This is a priority issue - let me connect you with our delivery team right away.",
        "department": "Delivery - Missing Package",
        "priority": "high"
      }
    },
    {
      "nodeId": "change_address",
      "type": "buttons",
      "positionX": 620,
      "positionY": 1480,
      "config": {
        "message": "Address changes depend on the order status. Has your order been shipped yet?",
        "buttons": [
          {
            "label": "Not yet shipped",
            "value": "address_change_possible"
          },
          {
            "label": "Already shipped",
            "value": "address_change_shipped"
          },
          {
            "label": "I'm not sure",
            "value": "collect_info"
          }
        ]
      }
    },
    {
      "nodeId": "address_change_possible",
      "type": "send_message",
      "positionX": 840,
      "positionY": 1480,
      "config": {
        "message": "Great news! You can still update your delivery address:"
      }
    },
    {
      "nodeId": "address_change_shipped",
      "type": "human_handoff",
      "positionX": 180,
      "positionY": 1620,
      "config": {
        "message": "Since your order is already shipped, we'll need to contact the courier. Let me connect you with our delivery team.",
        "department": "Delivery - Address Change",
        "priority": "medium"
      }
    },
    {
      "nodeId": "cancel_order",
      "type": "buttons",
      "positionX": 400,
      "positionY": 1620,
      "config": {
        "message": "I can help you cancel your order. Can you tell me why you'd like to cancel?",
        "buttons": [
          {
            "label": "Found a better price",
            "value": "price_match_offer"
          },
          {
            "label": "Ordered by mistake",
            "value": "cancel_confirm"
          },
          {
            "label": "No longer need it",
            "value": "cancel_confirm"
          },
          {
            "label": "Taking too long",
            "value": "delayed_package"
          }
        ]
      }
    },
    {
      "nodeId": "price_match_offer",
      "type": "buttons",
      "positionX": 620,
      "positionY": 1620,
      "config": {
        "message": "We offer price matching! If you found a lower price at a competitor, we may be able to match it. Would you like to:",
        "buttons": [
          {
            "label": "Request price match",
            "value": "collect_info"
          },
          {
            "label": "Still want to cancel",
            "value": "cancel_confirm"
          }
        ]
      }
    },
    {
      "nodeId": "cancel_confirm",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 1620,
      "config": {
        "message": "I'll help you cancel this order. Let me connect you with our team to process the cancellation.",
        "department": "Orders - Cancellation",
        "priority": "medium"
      }
    },
    {
      "nodeId": "product_menu",
      "type": "buttons",
      "positionX": 180,
      "positionY": 1760,
      "config": {
        "message": "What would you like to know about our products?",
        "buttons": [
          {
            "label": "Check product availability",
            "value": "product_availability"
          },
          {
            "label": "Product specifications",
            "value": "product_specs"
          },
          {
            "label": "Compare products",
            "value": "product_compare"
          },
          {
            "label": "Store locations",
            "value": "store_locations"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "product_availability",
      "type": "capture_input",
      "positionX": 400,
      "positionY": 1760,
      "config": {
        "prompt": "Enter a product name or code to see price, photos, and stock:",
        "variable": "product_name",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "availability_result",
      "type": "api_call",
      "positionX": 620,
      "positionY": 1760,
      "config": {
        "message": "Here are the closest matches I found in our online store:",
        "method": "GET",
        "url": "/api/shop/search?query=product_name",
        "outputVariable": "apiResults",
        "config": {
          "id": "availability_result",
          "type": "product_lookup",
          "message": "Here are the closest matches I found in our online store:",
          "query_field": "product_name",
          "limit": 4,
          "empty_message": "I could not find that product in our online catalog.",
          "buttons": [
            {
              "label": "Search again",
              "next": "product_availability"
            },
            {
              "label": "Store locations",
              "next": "store_locations"
            },
            {
              "label": "Back to Main Menu",
              "next": "start"
            }
          ]
        }
      }
    },
    {
      "nodeId": "branch_stock_check",
      "type": "buttons",
      "positionX": 840,
      "positionY": 1760,
      "config": {
        "message": "I've checked our system. Would you like to:",
        "buttons": [
          {
            "label": "Reserve this item",
            "value": "reserve_item"
          },
          {
            "label": "Get store directions",
            "value": "store_directions"
          },
          {
            "label": "Check another branch",
            "value": "availability_result"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "online_stock_check",
      "type": "send_message",
      "positionX": 180,
      "positionY": 1900,
      "config": {
        "message": "You can check real-time stock and order online:"
      }
    },
    {
      "nodeId": "product_specs",
      "type": "send_message",
      "positionX": 400,
      "positionY": 1900,
      "config": {
        "message": "You can find detailed specifications on our website:"
      }
    },
    {
      "nodeId": "store_locations",
      "type": "buttons",
      "positionX": 620,
      "positionY": 1900,
      "config": {
        "message": "We have branches across Ghana. Which location are you interested in?",
        "buttons": [
          {
            "label": "Ablekuma",
            "value": "store_ablekuma"
          },
          {
            "label": "Weija",
            "value": "store_weija"
          },
          {
            "label": "Accra Central",
            "value": "store_accra"
          },
          {
            "label": "Patasi (Kumasi)",
            "value": "store_patasi"
          },
          {
            "label": "Techiman",
            "value": "store_techiman"
          }
        ]
      }
    },
    {
      "nodeId": "store_ablekuma",
      "type": "send_message",
      "positionX": 840,
      "positionY": 1900,
      "config": {
        "message": "Here are the details for our Ablekuma branch:"
      }
    },
    {
      "nodeId": "store_weija",
      "type": "send_message",
      "positionX": 180,
      "positionY": 2040,
      "config": {
        "message": "Here are the details for our Weija branch:"
      }
    },
    {
      "nodeId": "store_accra",
      "type": "send_message",
      "positionX": 400,
      "positionY": 2040,
      "config": {
        "message": "Here are the details for our Accra Central branch:"
      }
    },
    {
      "nodeId": "store_patasi",
      "type": "send_message",
      "positionX": 620,
      "positionY": 2040,
      "config": {
        "message": "Here are the details for our Patasi (Kumasi) branch:"
      }
    },
    {
      "nodeId": "store_techiman",
      "type": "send_message",
      "positionX": 840,
      "positionY": 2040,
      "config": {
        "message": "Here are the details for our Techiman branch:"
      }
    },
    {
      "nodeId": "returns_menu",
      "type": "buttons",
      "positionX": 180,
      "positionY": 2180,
      "config": {
        "message": "I can help with returns and refunds. What's your situation?",
        "buttons": [
          {
            "label": "Product is faulty/defective",
            "value": "faulty_product"
          },
          {
            "label": "Wrong item received",
            "value": "wrong_item"
          },
          {
            "label": "Changed my mind",
            "value": "change_of_mind"
          },
          {
            "label": "Check refund status",
            "value": "refund_status"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "faulty_product",
      "type": "buttons",
      "positionX": 400,
      "positionY": 2180,
      "config": {
        "message": "I'm sorry to hear your product is faulty. When did you purchase it?",
        "buttons": [
          {
            "label": "Within 7 days",
            "value": "return_7days"
          },
          {
            "label": "7-30 days ago",
            "value": "return_30days"
          },
          {
            "label": "Over 30 days ago",
            "value": "warranty_check"
          }
        ]
      }
    },
    {
      "nodeId": "return_7days",
      "type": "send_message",
      "positionX": 620,
      "positionY": 2180,
      "config": {
        "message": "Good news! You're within our 7-day return window for a full refund or exchange:"
      }
    },
    {
      "nodeId": "return_30days",
      "type": "send_message",
      "positionX": 840,
      "positionY": 2180,
      "config": {
        "message": "You're within our 30-day exchange period:"
      }
    },
    {
      "nodeId": "warranty_check",
      "type": "buttons",
      "positionX": 180,
      "positionY": 2320,
      "config": {
        "message": "The product may still be under manufacturer warranty. Do you have your receipt or warranty card?",
        "buttons": [
          {
            "label": "Yes, I have it",
            "value": "warranty_claim"
          },
          {
            "label": "No, I lost it",
            "value": "find_purchase_record"
          }
        ]
      }
    },
    {
      "nodeId": "warranty_claim",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 2320,
      "config": {
        "message": "Let me connect you with our warranty team to process your claim.",
        "department": "Returns - Warranty Claim",
        "priority": "medium"
      }
    },
    {
      "nodeId": "wrong_item",
      "type": "human_handoff",
      "positionX": 620,
      "positionY": 2320,
      "config": {
        "message": "I apologize for the mix-up! This is a priority issue. Let me connect you with our team to arrange the correct item for you right away.",
        "department": "Orders - Wrong Item",
        "priority": "high"
      }
    },
    {
      "nodeId": "change_of_mind",
      "type": "send_message",
      "positionX": 840,
      "positionY": 2320,
      "config": {
        "message": "Here's our change of mind policy:"
      }
    },
    {
      "nodeId": "refund_status",
      "type": "capture_input",
      "positionX": 180,
      "positionY": 2460,
      "config": {
        "prompt": "Let me check your refund status. Please provide your return reference or order number:",
        "variable": "refund_reference",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "refund_status_result",
      "type": "buttons",
      "positionX": 400,
      "positionY": 2460,
      "config": {
        "message": "I've found your return request. Refunds typically take 3-5 business days after we receive the item. What would you like to do?",
        "buttons": [
          {
            "label": "This is taking too long",
            "value": "refund_delay"
          },
          {
            "label": "Got it, thanks!",
            "value": "resolved_end"
          }
        ]
      }
    },
    {
      "nodeId": "refund_delay",
      "type": "human_handoff",
      "positionX": 620,
      "positionY": 2460,
      "config": {
        "message": "I understand waiting for a refund is frustrating. Let me escalate this to our finance team.",
        "department": "Billing - Refund Delay",
        "priority": "high"
      }
    },
    {
      "nodeId": "schedule_pickup",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 2460,
      "config": {
        "message": "I'll arrange a pickup for you. Let me connect you with our returns team to schedule a convenient time.",
        "department": "Returns - Pickup Request",
        "priority": "medium"
      }
    },
    {
      "nodeId": "complaint_menu",
      "type": "buttons",
      "positionX": 180,
      "positionY": 2600,
      "config": {
        "message": "I'm sorry to hear you have a complaint. We take all feedback seriously. What is your complaint about?",
        "buttons": [
          {
            "label": "Poor customer service",
            "value": "complaint_service"
          },
          {
            "label": "Product quality issue",
            "value": "complaint_product"
          },
          {
            "label": "Delivery problem",
            "value": "complaint_delivery"
          },
          {
            "label": "Staff behavior",
            "value": "complaint_staff"
          },
          {
            "label": "Store experience",
            "value": "complaint_store"
          },
          {
            "label": "Other complaint",
            "value": "complaint_other"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_service",
      "type": "buttons",
      "positionX": 400,
      "positionY": 2600,
      "config": {
        "message": "I apologize for the poor service you experienced. Can you tell me more about what happened?",
        "buttons": [
          {
            "label": "Long wait times",
            "value": "complaint_wait_time"
          },
          {
            "label": "Unhelpful response",
            "value": "complaint_unhelpful"
          },
          {
            "label": "Issue not resolved",
            "value": "complaint_unresolved"
          },
          {
            "label": "Rude interaction",
            "value": "complaint_staff"
          },
          {
            "label": "Back to complaints",
            "value": "complaint_menu"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_wait_time",
      "type": "buttons",
      "positionX": 620,
      "positionY": 2600,
      "config": {
        "message": "I'm sorry you had to wait. Where did you experience the long wait?",
        "buttons": [
          {
            "label": "Phone support",
            "value": "complaint_details"
          },
          {
            "label": "In-store",
            "value": "complaint_store_location"
          },
          {
            "label": "Online chat",
            "value": "complaint_details"
          },
          {
            "label": "Delivery wait",
            "value": "complaint_delivery"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_unhelpful",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 2600,
      "config": {
        "message": "I'm truly sorry our team wasn't able to help you properly. This is unacceptable and I'll escalate this to our customer experience manager.",
        "department": "Complaint - Unhelpful Service",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_unresolved",
      "type": "capture_input",
      "positionX": 180,
      "positionY": 2740,
      "config": {
        "prompt": "I apologize that your issue wasn't resolved. Do you have a previous case or ticket number?",
        "variable": "previous_case",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "complaint_unresolved_escalate",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 2740,
      "config": {
        "message": "I'll personally ensure this gets resolved. Let me connect you with a senior team member who can help.",
        "department": "Complaint - Unresolved Issue",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_product",
      "type": "buttons",
      "positionX": 620,
      "positionY": 2740,
      "config": {
        "message": "I'm sorry to hear about the product issue. What specifically is the problem?",
        "buttons": [
          {
            "label": "Product doesn't match description",
            "value": "complaint_mismatch"
          },
          {
            "label": "Product broke quickly",
            "value": "complaint_durability"
          },
          {
            "label": "Poor quality materials",
            "value": "complaint_quality"
          },
          {
            "label": "Missing parts/accessories",
            "value": "complaint_missing_parts"
          },
          {
            "label": "Counterfeit/fake product",
            "value": "complaint_counterfeit"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_mismatch",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 2740,
      "config": {
        "message": "I'm very sorry the product didn't match what was advertised. This is a serious concern. I'll connect you with our quality team immediately.",
        "department": "Complaint - Product Mismatch",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_durability",
      "type": "buttons",
      "positionX": 180,
      "positionY": 2880,
      "config": {
        "message": "I'm sorry the product didn't last. How long did you have it before it broke?",
        "buttons": [
          {
            "label": "Less than a week",
            "value": "complaint_immediate_defect"
          },
          {
            "label": "1-4 weeks",
            "value": "complaint_early_failure"
          },
          {
            "label": "1-3 months",
            "value": "warranty_check"
          },
          {
            "label": "Over 3 months",
            "value": "warranty_check"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_immediate_defect",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 2880,
      "config": {
        "message": "A product failing within a week is completely unacceptable. I'm escalating this as urgent and we'll arrange an immediate replacement or full refund.",
        "department": "Complaint - Immediate Defect",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_early_failure",
      "type": "human_handoff",
      "positionX": 620,
      "positionY": 2880,
      "config": {
        "message": "I'm sorry the product failed so soon. This shouldn't happen. Let me connect you with our quality team to arrange a replacement.",
        "department": "Complaint - Early Product Failure",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_quality",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 2880,
      "config": {
        "message": "Thank you for bringing this to our attention. Product quality is very important to us. I'll report this to our quality assurance team.",
        "department": "Complaint - Product Quality",
        "priority": "medium"
      }
    },
    {
      "nodeId": "complaint_missing_parts",
      "type": "human_handoff",
      "positionX": 180,
      "positionY": 3020,
      "config": {
        "message": "I apologize for the incomplete product. Let me connect you with our team to send the missing parts right away.",
        "department": "Complaint - Missing Parts",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_counterfeit",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 3020,
      "config": {
        "message": "This is a very serious allegation that we take extremely seriously. Amalena only sells genuine products. I'm escalating this to our management team immediately for investigation.",
        "department": "Complaint - Counterfeit Allegation",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_delivery",
      "type": "buttons",
      "positionX": 620,
      "positionY": 3020,
      "config": {
        "message": "I'm sorry you had a delivery issue. What happened?",
        "buttons": [
          {
            "label": "Very late delivery",
            "value": "complaint_late_delivery"
          },
          {
            "label": "Package damaged",
            "value": "complaint_damaged"
          },
          {
            "label": "Wrong address delivered",
            "value": "complaint_wrong_address"
          },
          {
            "label": "Rude delivery person",
            "value": "complaint_delivery_staff"
          },
          {
            "label": "Package never arrived",
            "value": "missing_package"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_late_delivery",
      "type": "capture_input",
      "positionX": 840,
      "positionY": 3020,
      "config": {
        "prompt": "I'm sorry for the delay. How many days late was your delivery?",
        "variable": "days_late",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "complaint_late_escalate",
      "type": "human_handoff",
      "positionX": 180,
      "positionY": 3160,
      "config": {
        "message": "I sincerely apologize for the delay. This is not the experience we want for our customers. I'm reporting this to our logistics team.",
        "department": "Complaint - Late Delivery",
        "priority": "medium"
      }
    },
    {
      "nodeId": "complaint_damaged",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 3160,
      "config": {
        "message": "I'm very sorry your package arrived damaged. This is unacceptable. Let me connect you with our team to arrange a replacement immediately.",
        "department": "Complaint - Damaged Package",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_wrong_address",
      "type": "human_handoff",
      "positionX": 620,
      "positionY": 3160,
      "config": {
        "message": "I apologize for this mistake. Delivering to the wrong address is a serious error. I'll escalate this immediately to locate your package.",
        "department": "Complaint - Wrong Address Delivery",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_delivery_staff",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 3160,
      "config": {
        "message": "I'm sorry you had a negative experience with our delivery person. This behavior is not acceptable. I'll report this to our delivery management.",
        "department": "Complaint - Delivery Staff Behavior",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_staff",
      "type": "buttons",
      "positionX": 180,
      "positionY": 3300,
      "config": {
        "message": "I'm sorry you had a negative experience with our staff. Where did this happen?",
        "buttons": [
          {
            "label": "Ablekuma branch",
            "value": "complaint_staff_details"
          },
          {
            "label": "Weija branch",
            "value": "complaint_staff_details"
          },
          {
            "label": "Accra branch",
            "value": "complaint_staff_details"
          },
          {
            "label": "Patasi branch",
            "value": "complaint_staff_details"
          },
          {
            "label": "Techiman branch",
            "value": "complaint_staff_details"
          },
          {
            "label": "Phone/Online support",
            "value": "complaint_staff_details"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_staff_details",
      "type": "capture_input",
      "positionX": 400,
      "positionY": 3300,
      "config": {
        "prompt": "I'm truly sorry for this experience. Can you tell me approximately when this happened and describe what occurred?",
        "variable": "incident_date",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "complaint_staff_escalate",
      "type": "human_handoff",
      "positionX": 620,
      "positionY": 3300,
      "config": {
        "message": "Thank you for sharing this. Staff behavior complaints are taken very seriously. I'm escalating this to our HR and branch management team.",
        "department": "Complaint - Staff Behavior",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_store",
      "type": "buttons",
      "positionX": 840,
      "positionY": 3300,
      "config": {
        "message": "I'm sorry your store experience wasn't good. What was the issue?",
        "buttons": [
          {
            "label": "Store was dirty/messy",
            "value": "complaint_store_condition"
          },
          {
            "label": "Long checkout queues",
            "value": "complaint_store_queues"
          },
          {
            "label": "Items out of stock",
            "value": "complaint_store_stock"
          },
          {
            "label": "Pricing issues",
            "value": "complaint_store_pricing"
          },
          {
            "label": "Safety concern",
            "value": "complaint_store_safety"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_store_condition",
      "type": "human_handoff",
      "positionX": 180,
      "positionY": 3440,
      "config": {
        "message": "Thank you for letting us know. Store cleanliness is important to us. I'll report this to the branch manager immediately.",
        "department": "Complaint - Store Condition",
        "priority": "medium"
      }
    },
    {
      "nodeId": "complaint_store_queues",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 3440,
      "config": {
        "message": "I apologize for the long wait. We'll review our staffing to improve this. Thank you for bringing it to our attention.",
        "department": "Complaint - Long Queues",
        "priority": "low"
      }
    },
    {
      "nodeId": "complaint_store_stock",
      "type": "capture_input",
      "positionX": 620,
      "positionY": 3440,
      "config": {
        "prompt": "I'm sorry we didn't have what you needed. What product were you looking for?",
        "variable": "wanted_product",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "complaint_stock_escalate",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 3440,
      "config": {
        "message": "Thank you. I'll pass this to our inventory team to ensure we stock this item better. Would you like us to notify you when it's available?",
        "department": "Complaint - Out of Stock",
        "priority": "low"
      }
    },
    {
      "nodeId": "complaint_store_pricing",
      "type": "buttons",
      "positionX": 180,
      "positionY": 3580,
      "config": {
        "message": "I'm sorry you had a pricing issue. What happened?",
        "buttons": [
          {
            "label": "Charged wrong price",
            "value": "complaint_overcharged"
          },
          {
            "label": "Price different from tag",
            "value": "complaint_price_mismatch"
          },
          {
            "label": "Promotion not applied",
            "value": "complaint_promo_issue"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_overcharged",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 3580,
      "config": {
        "message": "I apologize for the overcharge. This needs immediate attention. Let me connect you with our billing team to process a refund.",
        "department": "Complaint - Overcharged",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_price_mismatch",
      "type": "human_handoff",
      "positionX": 620,
      "positionY": 3580,
      "config": {
        "message": "I'm sorry for the confusion. If the shelf price was different from what you were charged, we should honor the lower price. Let me help resolve this.",
        "department": "Complaint - Price Mismatch",
        "priority": "medium"
      }
    },
    {
      "nodeId": "complaint_promo_issue",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 3580,
      "config": {
        "message": "I apologize that the promotion wasn't applied correctly. Let me connect you with our team to ensure you get your discount.",
        "department": "Complaint - Promotion Issue",
        "priority": "medium"
      }
    },
    {
      "nodeId": "complaint_store_safety",
      "type": "human_handoff",
      "positionX": 180,
      "positionY": 3720,
      "config": {
        "message": "Safety is our top priority. Thank you for reporting this. I'm immediately escalating to our operations manager.",
        "department": "Complaint - Safety Concern",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_store_location",
      "type": "buttons",
      "positionX": 400,
      "positionY": 3720,
      "config": {
        "message": "Which store location was this?",
        "buttons": [
          {
            "label": "Ablekuma",
            "value": "complaint_details"
          },
          {
            "label": "Weija",
            "value": "complaint_details"
          },
          {
            "label": "Accra Central",
            "value": "complaint_details"
          },
          {
            "label": "Patasi (Kumasi)",
            "value": "complaint_details"
          },
          {
            "label": "Techiman",
            "value": "complaint_details"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_other",
      "type": "human_handoff",
      "positionX": 620,
      "positionY": 3720,
      "config": {
        "message": "I'm sorry you've had a negative experience. Please share the details and we'll make sure it's addressed.",
        "department": "Complaint - Other",
        "priority": "medium"
      }
    },
    {
      "nodeId": "complaint_details",
      "type": "capture_input",
      "positionX": 840,
      "positionY": 3720,
      "config": {
        "prompt": "To help us investigate and resolve this properly, please provide your name:",
        "variable": "customer_name",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "complaint_contact",
      "type": "capture_input",
      "positionX": 180,
      "positionY": 3860,
      "config": {
        "prompt": "What's the best way to reach you for follow-up?",
        "variable": "customer_phone",
        "validation": "phone",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "complaint_description",
      "type": "capture_input",
      "positionX": 400,
      "positionY": 3860,
      "config": {
        "prompt": "Please describe your complaint in detail so we can investigate thoroughly:",
        "variable": "complaint_description",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "complaint_resolution",
      "type": "buttons",
      "positionX": 620,
      "positionY": 3860,
      "config": {
        "message": "Thank you for sharing this. How would you like us to resolve this issue?",
        "buttons": [
          {
            "label": "Full refund",
            "value": "complaint_wants_refund"
          },
          {
            "label": "Replacement product",
            "value": "complaint_wants_replacement"
          },
          {
            "label": "Store credit/compensation",
            "value": "complaint_wants_credit"
          },
          {
            "label": "Just want it fixed/acknowledged",
            "value": "complaint_wants_acknowledgment"
          },
          {
            "label": "Speak to manager",
            "value": "complaint_wants_manager"
          }
        ]
      }
    },
    {
      "nodeId": "complaint_wants_refund",
      "type": "send_message",
      "positionX": 840,
      "positionY": 3860,
      "config": {
        "message": "I've noted that you'd like a full refund. Our team will review your case and process this as quickly as possible."
      }
    },
    {
      "nodeId": "complaint_wants_replacement",
      "type": "send_message",
      "positionX": 180,
      "positionY": 4000,
      "config": {
        "message": "I've noted that you'd like a replacement. We'll arrange this once we verify the details."
      }
    },
    {
      "nodeId": "complaint_wants_credit",
      "type": "send_message",
      "positionX": 400,
      "positionY": 4000,
      "config": {
        "message": "I've noted your request for store credit or compensation. Our team will determine the appropriate amount based on your experience."
      }
    },
    {
      "nodeId": "complaint_wants_acknowledgment",
      "type": "send_message",
      "positionX": 620,
      "positionY": 4000,
      "config": {
        "message": "Thank you for bringing this to our attention. Your feedback helps us improve. We'll ensure this is addressed."
      }
    },
    {
      "nodeId": "complaint_wants_manager",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 4000,
      "config": {
        "message": "I'll have a manager contact you directly. They will reach out within 24 hours.",
        "department": "Complaint - Manager Callback Requested",
        "priority": "high"
      }
    },
    {
      "nodeId": "complaint_submit",
      "type": "human_handoff",
      "positionX": 180,
      "positionY": 4140,
      "config": {
        "message": "Your complaint has been logged and assigned to our customer care team. You'll receive a response within 24-48 hours.",
        "department": "Support",
        "priority": "normal"
      }
    },
    {
      "nodeId": "account_menu",
      "type": "buttons",
      "positionX": 400,
      "positionY": 4140,
      "config": {
        "message": "What do you need help with?",
        "buttons": [
          {
            "label": "Reset password",
            "value": "password_reset"
          },
          {
            "label": "Update my details",
            "value": "update_details"
          },
          {
            "label": "Payment issues",
            "value": "payment_issues"
          },
          {
            "label": "Loyalty points",
            "value": "loyalty_points"
          },
          {
            "label": "Back to Main Menu",
            "value": "start"
          }
        ]
      }
    },
    {
      "nodeId": "password_reset",
      "type": "send_message",
      "positionX": 620,
      "positionY": 4140,
      "config": {
        "message": "Here's how to reset your password:"
      }
    },
    {
      "nodeId": "email_not_received",
      "type": "buttons",
      "positionX": 840,
      "positionY": 4140,
      "config": {
        "message": "If you didn't receive the email, it could be because:",
        "buttons": [
          {
            "label": "Email might be wrong",
            "value": "collect_info"
          },
          {
            "label": "Try again with different email",
            "value": "password_reset"
          }
        ]
      }
    },
    {
      "nodeId": "update_details",
      "type": "send_message",
      "positionX": 180,
      "positionY": 4280,
      "config": {
        "message": "You can update your details in your account:"
      }
    },
    {
      "nodeId": "payment_issues",
      "type": "buttons",
      "positionX": 400,
      "positionY": 4280,
      "config": {
        "message": "What payment issue are you experiencing?",
        "buttons": [
          {
            "label": "Payment failed",
            "value": "payment_failed"
          },
          {
            "label": "Charged twice",
            "value": "double_charge"
          },
          {
            "label": "Mobile money not confirmed",
            "value": "momo_pending"
          },
          {
            "label": "Need invoice/receipt",
            "value": "need_receipt"
          }
        ]
      }
    },
    {
      "nodeId": "payment_failed",
      "type": "send_message",
      "positionX": 620,
      "positionY": 4280,
      "config": {
        "message": "Payment failures can happen for several reasons:"
      }
    },
    {
      "nodeId": "double_charge",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 4280,
      "config": {
        "message": "I'm sorry you were charged twice! This is a priority issue. Let me connect you with our billing team immediately.",
        "department": "Billing - Double Charge",
        "priority": "high"
      }
    },
    {
      "nodeId": "momo_pending",
      "type": "send_message",
      "positionX": 180,
      "positionY": 4420,
      "config": {
        "message": "Mobile money payments sometimes take a few minutes to confirm:"
      }
    },
    {
      "nodeId": "need_receipt",
      "type": "send_message",
      "positionX": 400,
      "positionY": 4420,
      "config": {
        "message": "Here's how to get your receipt:"
      }
    },
    {
      "nodeId": "loyalty_points",
      "type": "send_message",
      "positionX": 620,
      "positionY": 4420,
      "config": {
        "message": "Here's information about Amalena Rewards:"
      }
    },
    {
      "nodeId": "redeem_points",
      "type": "send_message",
      "positionX": 840,
      "positionY": 4420,
      "config": {
        "message": "Redeeming points is easy:"
      }
    },
    {
      "nodeId": "missing_points",
      "type": "human_handoff",
      "positionX": 180,
      "positionY": 4560,
      "config": {
        "message": "I'll help you get your missing points credited. Let me connect you with our loyalty team.",
        "department": "Account - Missing Points",
        "priority": "low"
      }
    },
    {
      "nodeId": "collect_info",
      "type": "capture_input",
      "positionX": 400,
      "positionY": 4560,
      "config": {
        "prompt": "To connect you with the right agent, please share your name:",
        "variable": "customer_name",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "collect_phone",
      "type": "capture_input",
      "positionX": 620,
      "positionY": 4560,
      "config": {
        "prompt": "What's the best phone number to reach you?",
        "variable": "customer_phone",
        "validation": "phone",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "collect_issue",
      "type": "capture_input",
      "positionX": 840,
      "positionY": 4560,
      "config": {
        "prompt": "Please briefly describe what you need help with:",
        "variable": "issue_description",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "transcript_offer",
      "type": "buttons",
      "positionX": 180,
      "positionY": 4700,
      "config": {
        "message": "Would you like a copy of this conversation sent to your email?",
        "buttons": [
          {
            "label": "Yes please",
            "value": "collect_email"
          },
          {
            "label": "No thanks",
            "value": "agent_queue"
          }
        ]
      }
    },
    {
      "nodeId": "collect_email",
      "type": "capture_input",
      "positionX": 400,
      "positionY": 4700,
      "config": {
        "prompt": "Please enter your email address:",
        "variable": "transcript_email",
        "validation": "email",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "agent_queue",
      "type": "human_handoff",
      "positionX": 620,
      "positionY": 4700,
      "config": {
        "message": "Thanks! I'm connecting you with a support agent now. Please hold on.",
        "department": "Support",
        "priority": "normal"
      }
    },
    {
      "nodeId": "resolved_end",
      "type": "buttons",
      "positionX": 840,
      "positionY": 4700,
      "config": {
        "message": "Great! Is there anything else I can help you with?",
        "buttons": [
          {
            "label": "Yes, another question",
            "value": "start"
          },
          {
            "label": "No, that's all",
            "value": "resolution_check"
          }
        ]
      }
    },
    {
      "nodeId": "resolution_check",
      "type": "buttons",
      "positionX": 180,
      "positionY": 4840,
      "config": {
        "message": "Before you go, how did this wrap up today?",
        "buttons": [
          {
            "label": "Resolved in one go",
            "value": "resolution_fast"
          },
          {
            "label": "Resolved after a few steps",
            "value": "resolution_steps"
          },
          {
            "label": "Not resolved yet",
            "value": "resolution_open"
          },
          {
            "label": "Still open after multiple tries",
            "value": "resolution_open"
          }
        ]
      }
    },
    {
      "nodeId": "resolution_fast",
      "type": "send_message",
      "positionX": 400,
      "positionY": 4840,
      "config": {
        "message": "Love to hear it. Thanks for confirming."
      }
    },
    {
      "nodeId": "resolution_steps",
      "type": "send_message",
      "positionX": 620,
      "positionY": 4840,
      "config": {
        "message": "Thanks for the update. We will keep making this faster."
      }
    },
    {
      "nodeId": "resolution_open",
      "type": "send_message",
      "positionX": 840,
      "positionY": 4840,
      "config": {
        "message": "Sorry it is still open. We will keep your case on record."
      }
    },
    {
      "nodeId": "resolution_followup",
      "type": "buttons",
      "positionX": 180,
      "positionY": 4980,
      "config": {
        "message": "Want to leave a quick rating before you close this chat?",
        "buttons": [
          {
            "label": "Yes, rate my chat",
            "value": "survey_q1"
          },
          {
            "label": "Skip to end",
            "value": "end_prompt"
          }
        ]
      }
    },
    {
      "nodeId": "survey_start",
      "type": "send_message",
      "positionX": 400,
      "positionY": 4980,
      "config": {
        "message": "Thanks for chatting with Amalena Support! We'd love a quick rating."
      }
    },
    {
      "nodeId": "survey_q1",
      "type": "capture_input",
      "positionX": 620,
      "positionY": 4980,
      "config": {
        "prompt": "How was your experience today? (1 = Poor, 5 = Excellent)",
        "variable": "input",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "survey_q2",
      "type": "capture_input",
      "positionX": 840,
      "positionY": 4980,
      "config": {
        "prompt": "Was your issue resolved? (1 = Not at all, 5 = Completely)",
        "variable": "input",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "survey_complete",
      "type": "send_message",
      "positionX": 180,
      "positionY": 5120,
      "config": {
        "message": "Thanks for the feedback. It helps us serve you better."
      }
    },
    {
      "nodeId": "end_prompt",
      "type": "send_message",
      "positionX": 400,
      "positionY": 5120,
      "config": {
        "message": "All set. You can close this chat whenever you're ready."
      }
    },
    {
      "nodeId": "store_directions",
      "type": "send_message",
      "positionX": 620,
      "positionY": 5120,
      "config": {
        "message": "You can get directions using Google Maps:"
      }
    },
    {
      "nodeId": "reserve_item",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 5120,
      "config": {
        "message": "I'll help you reserve this item. Let me connect you with the store to confirm availability.",
        "department": "Sales - Product Reservation",
        "priority": "low"
      }
    },
    {
      "nodeId": "all_stock_check",
      "type": "buttons",
      "positionX": 180,
      "positionY": 5260,
      "config": {
        "message": "I can check stock across all locations. Would you prefer:",
        "buttons": [
          {
            "label": "Fastest delivery",
            "value": "online_stock_check"
          },
          {
            "label": "Pickup today",
            "value": "availability_result"
          },
          {
            "label": "Talk to sales team",
            "value": "collect_info"
          }
        ]
      }
    },
    {
      "nodeId": "product_compare",
      "type": "send_message",
      "positionX": 400,
      "positionY": 5260,
      "config": {
        "message": "Our website has a compare feature:"
      }
    },
    {
      "nodeId": "find_purchase_record",
      "type": "capture_input",
      "positionX": 620,
      "positionY": 5260,
      "config": {
        "prompt": "No worries! I can look up your purchase. What email or phone did you use?",
        "variable": "customer_contact",
        "validation": "none",
        "errorMessage": "Please provide a valid value.",
        "maxRetries": 3
      }
    },
    {
      "nodeId": "new_delivery_estimate",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 5260,
      "config": {
        "message": "Let me check with our logistics team for an updated delivery estimate.",
        "department": "Delivery - Delay Inquiry",
        "priority": "medium"
      }
    },
    {
      "nodeId": "priority_escalation",
      "type": "human_handoff",
      "positionX": 180,
      "positionY": 5400,
      "config": {
        "message": "I'll mark your order as priority and escalate to our delivery team.",
        "department": "Delivery - Priority Request",
        "priority": "high"
      }
    },
    {
      "nodeId": "cancel_refund",
      "type": "human_handoff",
      "positionX": 400,
      "positionY": 5400,
      "config": {
        "message": "I understand. Let me connect you with our team to process the cancellation and refund.",
        "department": "Orders - Cancel and Refund",
        "priority": "medium"
      }
    },
    {
      "nodeId": "order_history_info",
      "type": "send_message",
      "positionX": 620,
      "positionY": 5400,
      "config": {
        "message": "You can view your complete order history online:"
      }
    },
    {
      "nodeId": "refund_request",
      "type": "human_handoff",
      "positionX": 840,
      "positionY": 5400,
      "config": {
        "message": "I understand you prefer a refund. Let me connect you with our returns team to discuss your options.",
        "department": "Returns - Refund Request",
        "priority": "medium"
      }
    }
  ],
  "edges": [
    {
      "edgeId": "e-workflow_start-main_menu",
      "source": "workflow_start",
      "target": "main_menu"
    },
    {
      "edgeId": "e-start-order_tracking-0",
      "source": "main_menu",
      "target": "order_tracking",
      "label": "Track My Order",
      "sourceHandle": "order_tracking"
    },
    {
      "edgeId": "e-start-order_start-1",
      "source": "main_menu",
      "target": "order_start",
      "label": "Place an Order",
      "sourceHandle": "order_start"
    },
    {
      "edgeId": "e-start-product_menu-2",
      "source": "main_menu",
      "target": "product_menu",
      "label": "Product Inquiry",
      "sourceHandle": "product_menu"
    },
    {
      "edgeId": "e-start-returns_menu-3",
      "source": "main_menu",
      "target": "returns_menu",
      "label": "Returns & Refunds",
      "sourceHandle": "returns_menu"
    },
    {
      "edgeId": "e-start-info_menu-4",
      "source": "main_menu",
      "target": "info_menu",
      "label": "Store & Website Info",
      "sourceHandle": "info_menu"
    },
    {
      "edgeId": "e-start-pregnancy_disclaimer-5",
      "source": "main_menu",
      "target": "pregnancy_disclaimer",
      "label": "Pregnancy & Birth Prep",
      "sourceHandle": "pregnancy_disclaimer"
    },
    {
      "edgeId": "e-start-complaint_menu-6",
      "source": "main_menu",
      "target": "complaint_menu",
      "label": "File a Complaint",
      "sourceHandle": "complaint_menu"
    },
    {
      "edgeId": "e-start-account_menu-7",
      "source": "main_menu",
      "target": "account_menu",
      "label": "Account & Billing",
      "sourceHandle": "account_menu"
    },
    {
      "edgeId": "e-order_start-order_login_prompt-8",
      "source": "order_start",
      "target": "order_login_prompt",
      "label": "Guest",
      "sourceHandle": "guest"
    },
    {
      "edgeId": "e-order_start-order_product_search-9",
      "source": "order_start",
      "target": "order_product_search",
      "label": "Logged in",
      "sourceHandle": "logged_in"
    },
    {
      "edgeId": "e-order_login_prompt-product_availability-10",
      "source": "order_login_prompt",
      "target": "product_availability",
      "label": "Browse products",
      "sourceHandle": "product_availability"
    },
    {
      "edgeId": "e-order_login_prompt-start-11",
      "source": "order_login_prompt",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-order_product_search-order_product_results-12",
      "source": "order_product_search",
      "target": "order_product_results",
      "label": "Next"
    },
    {
      "edgeId": "e-order_product_results-order_product_search-13",
      "source": "order_product_results",
      "target": "order_product_search",
      "label": "Search another product",
      "sourceHandle": "order_product_search"
    },
    {
      "edgeId": "e-order_product_results-start-14",
      "source": "order_product_results",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-info_menu-info_about-15",
      "source": "info_menu",
      "target": "info_about",
      "label": "About Us",
      "sourceHandle": "info_about"
    },
    {
      "edgeId": "e-info_menu-info_contact-16",
      "source": "info_menu",
      "target": "info_contact",
      "label": "Contact Us",
      "sourceHandle": "info_contact"
    },
    {
      "edgeId": "e-info_menu-info_delivery-17",
      "source": "info_menu",
      "target": "info_delivery",
      "label": "Delivery & Shipping",
      "sourceHandle": "info_delivery"
    },
    {
      "edgeId": "e-info_menu-info_returns_policy-18",
      "source": "info_menu",
      "target": "info_returns_policy",
      "label": "Return & Exchange Policy",
      "sourceHandle": "info_returns_policy"
    },
    {
      "edgeId": "e-info_menu-store_locations-19",
      "source": "info_menu",
      "target": "store_locations",
      "label": "Store Locations",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-info_menu-info_privacy-20",
      "source": "info_menu",
      "target": "info_privacy",
      "label": "Privacy Policy",
      "sourceHandle": "info_privacy"
    },
    {
      "edgeId": "e-info_menu-info_customer_service-21",
      "source": "info_menu",
      "target": "info_customer_service",
      "label": "Customer Service",
      "sourceHandle": "info_customer_service"
    },
    {
      "edgeId": "e-info_menu-info_blog-22",
      "source": "info_menu",
      "target": "info_blog",
      "label": "Blog",
      "sourceHandle": "info_blog"
    },
    {
      "edgeId": "e-info_menu-info_social-23",
      "source": "info_menu",
      "target": "info_social",
      "label": "Social Links",
      "sourceHandle": "info_social"
    },
    {
      "edgeId": "e-info_menu-start-24",
      "source": "info_menu",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-info_about-info_menu-25",
      "source": "info_about",
      "target": "info_menu",
      "label": "More store info",
      "sourceHandle": "info_menu"
    },
    {
      "edgeId": "e-info_about-start-26",
      "source": "info_about",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-info_contact-info_customer_service-27",
      "source": "info_contact",
      "target": "info_customer_service",
      "label": "Customer service",
      "sourceHandle": "info_customer_service"
    },
    {
      "edgeId": "e-info_contact-start-28",
      "source": "info_contact",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-info_delivery-order_tracking-29",
      "source": "info_delivery",
      "target": "order_tracking",
      "label": "Track my order",
      "sourceHandle": "order_tracking"
    },
    {
      "edgeId": "e-info_delivery-info_menu-30",
      "source": "info_delivery",
      "target": "info_menu",
      "label": "Back to Info Menu",
      "sourceHandle": "info_menu"
    },
    {
      "edgeId": "e-info_returns_policy-returns_menu-31",
      "source": "info_returns_policy",
      "target": "returns_menu",
      "label": "Return options",
      "sourceHandle": "returns_menu"
    },
    {
      "edgeId": "e-info_returns_policy-info_menu-32",
      "source": "info_returns_policy",
      "target": "info_menu",
      "label": "Back to Info Menu",
      "sourceHandle": "info_menu"
    },
    {
      "edgeId": "e-info_privacy-info_menu-33",
      "source": "info_privacy",
      "target": "info_menu",
      "label": "Back to Info Menu",
      "sourceHandle": "info_menu"
    },
    {
      "edgeId": "e-info_privacy-start-34",
      "source": "info_privacy",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-info_customer_service-collect_info-35",
      "source": "info_customer_service",
      "target": "collect_info",
      "label": "Talk to an agent",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-info_customer_service-info_menu-36",
      "source": "info_customer_service",
      "target": "info_menu",
      "label": "Back to Info Menu",
      "sourceHandle": "info_menu"
    },
    {
      "edgeId": "e-info_blog-info_menu-37",
      "source": "info_blog",
      "target": "info_menu",
      "label": "Back to Info Menu",
      "sourceHandle": "info_menu"
    },
    {
      "edgeId": "e-info_blog-start-38",
      "source": "info_blog",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-info_social-info_menu-39",
      "source": "info_social",
      "target": "info_menu",
      "label": "Back to Info Menu",
      "sourceHandle": "info_menu"
    },
    {
      "edgeId": "e-info_social-start-40",
      "source": "info_social",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-pregnancy_disclaimer-pregnancy_menu-41",
      "source": "pregnancy_disclaimer",
      "target": "pregnancy_menu",
      "label": "Next"
    },
    {
      "edgeId": "e-pregnancy_menu-pregnancy_best_practices-42",
      "source": "pregnancy_menu",
      "target": "pregnancy_best_practices",
      "label": "Best practices during pregnancy",
      "sourceHandle": "pregnancy_best_practices"
    },
    {
      "edgeId": "e-pregnancy_menu-pregnancy_warning_signs-43",
      "source": "pregnancy_menu",
      "target": "pregnancy_warning_signs",
      "label": "Danger signs to watch",
      "sourceHandle": "pregnancy_warning_signs"
    },
    {
      "edgeId": "e-pregnancy_menu-delivery_checklist_intro-44",
      "source": "pregnancy_menu",
      "target": "delivery_checklist_intro",
      "label": "Delivery preparation checklist",
      "sourceHandle": "delivery_checklist_intro"
    },
    {
      "edgeId": "e-pregnancy_menu-pregnancy_shop_menu-45",
      "source": "pregnancy_menu",
      "target": "pregnancy_shop_menu",
      "label": "Shop essentials",
      "sourceHandle": "pregnancy_shop_menu"
    },
    {
      "edgeId": "e-pregnancy_menu-start-46",
      "source": "pregnancy_menu",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-pregnancy_best_practices-preg_source_unicef-47",
      "source": "pregnancy_best_practices",
      "target": "preg_source_unicef",
      "label": "UNICEF maternal health",
      "sourceHandle": "preg_source_unicef"
    },
    {
      "edgeId": "e-pregnancy_best_practices-preg_source_ghm-48",
      "source": "pregnancy_best_practices",
      "target": "preg_source_ghm",
      "label": "Childbirth video series",
      "sourceHandle": "preg_source_ghm"
    },
    {
      "edgeId": "e-pregnancy_best_practices-preg_source_amref-49",
      "source": "pregnancy_best_practices",
      "target": "preg_source_amref",
      "label": "AMREF maternal health",
      "sourceHandle": "preg_source_amref"
    },
    {
      "edgeId": "e-pregnancy_best_practices-preg_source_mammy-50",
      "source": "pregnancy_best_practices",
      "target": "preg_source_mammy",
      "label": "Mammy Health tips",
      "sourceHandle": "preg_source_mammy"
    },
    {
      "edgeId": "e-pregnancy_best_practices-preg_source_helpmum-51",
      "source": "pregnancy_best_practices",
      "target": "preg_source_helpmum",
      "label": "HelpMum resources",
      "sourceHandle": "preg_source_helpmum"
    },
    {
      "edgeId": "e-pregnancy_best_practices-pregnancy_menu-52",
      "source": "pregnancy_best_practices",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-preg_source_unicef-pregnancy_best_practices-53",
      "source": "preg_source_unicef",
      "target": "pregnancy_best_practices",
      "label": "More sources",
      "sourceHandle": "pregnancy_best_practices"
    },
    {
      "edgeId": "e-preg_source_unicef-pregnancy_menu-54",
      "source": "preg_source_unicef",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-preg_source_ghm-pregnancy_best_practices-55",
      "source": "preg_source_ghm",
      "target": "pregnancy_best_practices",
      "label": "More sources",
      "sourceHandle": "pregnancy_best_practices"
    },
    {
      "edgeId": "e-preg_source_ghm-pregnancy_menu-56",
      "source": "preg_source_ghm",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-preg_source_amref-pregnancy_best_practices-57",
      "source": "preg_source_amref",
      "target": "pregnancy_best_practices",
      "label": "More sources",
      "sourceHandle": "pregnancy_best_practices"
    },
    {
      "edgeId": "e-preg_source_amref-pregnancy_menu-58",
      "source": "preg_source_amref",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-preg_source_mammy-pregnancy_best_practices-59",
      "source": "preg_source_mammy",
      "target": "pregnancy_best_practices",
      "label": "More sources",
      "sourceHandle": "pregnancy_best_practices"
    },
    {
      "edgeId": "e-preg_source_mammy-pregnancy_menu-60",
      "source": "preg_source_mammy",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-preg_source_helpmum-pregnancy_best_practices-61",
      "source": "preg_source_helpmum",
      "target": "pregnancy_best_practices",
      "label": "More sources",
      "sourceHandle": "pregnancy_best_practices"
    },
    {
      "edgeId": "e-preg_source_helpmum-pregnancy_menu-62",
      "source": "preg_source_helpmum",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-pregnancy_warning_signs-pregnancy_menu-63",
      "source": "pregnancy_warning_signs",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-pregnancy_warning_signs-collect_info-64",
      "source": "pregnancy_warning_signs",
      "target": "collect_info",
      "label": "Talk to an agent",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-delivery_checklist_intro-checklist_mother_prep-65",
      "source": "delivery_checklist_intro",
      "target": "checklist_mother_prep",
      "label": "Mother's preparation",
      "sourceHandle": "checklist_mother_prep"
    },
    {
      "edgeId": "e-delivery_checklist_intro-checklist_baby_prep-66",
      "source": "delivery_checklist_intro",
      "target": "checklist_baby_prep",
      "label": "Baby's preparation",
      "sourceHandle": "checklist_baby_prep"
    },
    {
      "edgeId": "e-delivery_checklist_intro-checklist_delivery_supplies-67",
      "source": "delivery_checklist_intro",
      "target": "checklist_delivery_supplies",
      "label": "Delivery & hospital supplies",
      "sourceHandle": "checklist_delivery_supplies"
    },
    {
      "edgeId": "e-delivery_checklist_intro-checklist_birth_planning-68",
      "source": "delivery_checklist_intro",
      "target": "checklist_birth_planning",
      "label": "Birth planning & support",
      "sourceHandle": "checklist_birth_planning"
    },
    {
      "edgeId": "e-delivery_checklist_intro-checklist_health_messages-69",
      "source": "delivery_checklist_intro",
      "target": "checklist_health_messages",
      "label": "Important health messages",
      "sourceHandle": "checklist_health_messages"
    },
    {
      "edgeId": "e-delivery_checklist_intro-pregnancy_shop_menu-70",
      "source": "delivery_checklist_intro",
      "target": "pregnancy_shop_menu",
      "label": "Shop essentials",
      "sourceHandle": "pregnancy_shop_menu"
    },
    {
      "edgeId": "e-delivery_checklist_intro-pregnancy_menu-71",
      "source": "delivery_checklist_intro",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-checklist_mother_prep-delivery_checklist_intro-72",
      "source": "checklist_mother_prep",
      "target": "delivery_checklist_intro",
      "label": "Back to checklist",
      "sourceHandle": "delivery_checklist_intro"
    },
    {
      "edgeId": "e-checklist_mother_prep-pregnancy_shop_menu-73",
      "source": "checklist_mother_prep",
      "target": "pregnancy_shop_menu",
      "label": "Shop essentials",
      "sourceHandle": "pregnancy_shop_menu"
    },
    {
      "edgeId": "e-checklist_baby_prep-delivery_checklist_intro-74",
      "source": "checklist_baby_prep",
      "target": "delivery_checklist_intro",
      "label": "Back to checklist",
      "sourceHandle": "delivery_checklist_intro"
    },
    {
      "edgeId": "e-checklist_baby_prep-pregnancy_shop_menu-75",
      "source": "checklist_baby_prep",
      "target": "pregnancy_shop_menu",
      "label": "Shop essentials",
      "sourceHandle": "pregnancy_shop_menu"
    },
    {
      "edgeId": "e-checklist_delivery_supplies-delivery_checklist_intro-76",
      "source": "checklist_delivery_supplies",
      "target": "delivery_checklist_intro",
      "label": "Back to checklist",
      "sourceHandle": "delivery_checklist_intro"
    },
    {
      "edgeId": "e-checklist_delivery_supplies-pregnancy_menu-77",
      "source": "checklist_delivery_supplies",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-checklist_birth_planning-delivery_checklist_intro-78",
      "source": "checklist_birth_planning",
      "target": "delivery_checklist_intro",
      "label": "Back to checklist",
      "sourceHandle": "delivery_checklist_intro"
    },
    {
      "edgeId": "e-checklist_birth_planning-pregnancy_menu-79",
      "source": "checklist_birth_planning",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-checklist_health_messages-delivery_checklist_intro-80",
      "source": "checklist_health_messages",
      "target": "delivery_checklist_intro",
      "label": "Back to checklist",
      "sourceHandle": "delivery_checklist_intro"
    },
    {
      "edgeId": "e-checklist_health_messages-pregnancy_menu-81",
      "source": "checklist_health_messages",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-pregnancy_shop_menu-pregnancy_shop_mother-82",
      "source": "pregnancy_shop_menu",
      "target": "pregnancy_shop_mother",
      "label": "Mother essentials",
      "sourceHandle": "pregnancy_shop_mother"
    },
    {
      "edgeId": "e-pregnancy_shop_menu-pregnancy_shop_baby-83",
      "source": "pregnancy_shop_menu",
      "target": "pregnancy_shop_baby",
      "label": "Baby essentials",
      "sourceHandle": "pregnancy_shop_baby"
    },
    {
      "edgeId": "e-pregnancy_shop_menu-pregnancy_shop_search-84",
      "source": "pregnancy_shop_menu",
      "target": "pregnancy_shop_search",
      "label": "Search any item",
      "sourceHandle": "pregnancy_shop_search"
    },
    {
      "edgeId": "e-pregnancy_shop_menu-pregnancy_menu-85",
      "source": "pregnancy_shop_menu",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-pregnancy_shop_mother-pregnancy_shop_results-86",
      "source": "pregnancy_shop_mother",
      "target": "pregnancy_shop_results",
      "label": "Maternity pads",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_mother-pregnancy_shop_results-87",
      "source": "pregnancy_shop_mother",
      "target": "pregnancy_shop_results",
      "label": "Nursing bras",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_mother-pregnancy_shop_results-88",
      "source": "pregnancy_shop_mother",
      "target": "pregnancy_shop_results",
      "label": "Maternity gown",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_mother-pregnancy_shop_results-89",
      "source": "pregnancy_shop_mother",
      "target": "pregnancy_shop_results",
      "label": "Sanitary wipes",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_mother-pregnancy_shop_results-90",
      "source": "pregnancy_shop_mother",
      "target": "pregnancy_shop_results",
      "label": "Body lotion",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_mother-pregnancy_shop_results-91",
      "source": "pregnancy_shop_mother",
      "target": "pregnancy_shop_results",
      "label": "Petroleum jelly",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_mother-pregnancy_shop_menu-92",
      "source": "pregnancy_shop_mother",
      "target": "pregnancy_shop_menu",
      "label": "Back",
      "sourceHandle": "pregnancy_shop_menu"
    },
    {
      "edgeId": "e-pregnancy_shop_baby-pregnancy_shop_results-93",
      "source": "pregnancy_shop_baby",
      "target": "pregnancy_shop_results",
      "label": "Newborn diapers",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_baby-pregnancy_shop_results-94",
      "source": "pregnancy_shop_baby",
      "target": "pregnancy_shop_results",
      "label": "Baby wipes",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_baby-pregnancy_shop_results-95",
      "source": "pregnancy_shop_baby",
      "target": "pregnancy_shop_results",
      "label": "Baby soap",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_baby-pregnancy_shop_results-96",
      "source": "pregnancy_shop_baby",
      "target": "pregnancy_shop_results",
      "label": "Baby oil",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_baby-pregnancy_shop_results-97",
      "source": "pregnancy_shop_baby",
      "target": "pregnancy_shop_results",
      "label": "Baby blanket",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_baby-pregnancy_shop_results-98",
      "source": "pregnancy_shop_baby",
      "target": "pregnancy_shop_results",
      "label": "Receiving cloth",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_baby-pregnancy_shop_results-99",
      "source": "pregnancy_shop_baby",
      "target": "pregnancy_shop_results",
      "label": "Baby cap",
      "sourceHandle": "pregnancy_shop_results"
    },
    {
      "edgeId": "e-pregnancy_shop_baby-pregnancy_shop_menu-100",
      "source": "pregnancy_shop_baby",
      "target": "pregnancy_shop_menu",
      "label": "Back",
      "sourceHandle": "pregnancy_shop_menu"
    },
    {
      "edgeId": "e-pregnancy_shop_search-pregnancy_shop_results-101",
      "source": "pregnancy_shop_search",
      "target": "pregnancy_shop_results",
      "label": "Next"
    },
    {
      "edgeId": "e-pregnancy_shop_results-pregnancy_shop_search-102",
      "source": "pregnancy_shop_results",
      "target": "pregnancy_shop_search",
      "label": "Search another item",
      "sourceHandle": "pregnancy_shop_search"
    },
    {
      "edgeId": "e-pregnancy_shop_results-pregnancy_shop_menu-103",
      "source": "pregnancy_shop_results",
      "target": "pregnancy_shop_menu",
      "label": "Shop menu",
      "sourceHandle": "pregnancy_shop_menu"
    },
    {
      "edgeId": "e-pregnancy_shop_results-pregnancy_menu-104",
      "source": "pregnancy_shop_results",
      "target": "pregnancy_menu",
      "label": "Back to Pregnancy Menu",
      "sourceHandle": "pregnancy_menu"
    },
    {
      "edgeId": "e-order_tracking-enter_order_number-105",
      "source": "order_tracking",
      "target": "enter_order_number",
      "label": "Yes, I have it",
      "sourceHandle": "enter_order_number"
    },
    {
      "edgeId": "e-order_tracking-find_order-106",
      "source": "order_tracking",
      "target": "find_order",
      "label": "No, help me find it",
      "sourceHandle": "find_order"
    },
    {
      "edgeId": "e-order_tracking-start-107",
      "source": "order_tracking",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-enter_order_number-order_status_check-108",
      "source": "enter_order_number",
      "target": "order_status_check",
      "label": "Next"
    },
    {
      "edgeId": "e-order_status_check-package_location-109",
      "source": "order_status_check",
      "target": "package_location",
      "label": "Where is my package?",
      "sourceHandle": "package_location"
    },
    {
      "edgeId": "e-order_status_check-change_address-110",
      "source": "order_status_check",
      "target": "change_address",
      "label": "Change delivery address",
      "sourceHandle": "change_address"
    },
    {
      "edgeId": "e-order_status_check-cancel_order-111",
      "source": "order_status_check",
      "target": "cancel_order",
      "label": "Cancel this order",
      "sourceHandle": "cancel_order"
    },
    {
      "edgeId": "e-order_status_check-start-112",
      "source": "order_status_check",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-find_order-order_lookup_result-113",
      "source": "find_order",
      "target": "order_lookup_result",
      "label": "Next"
    },
    {
      "edgeId": "e-order_lookup_result-package_location-114",
      "source": "order_lookup_result",
      "target": "package_location",
      "label": "Track latest order",
      "sourceHandle": "package_location"
    },
    {
      "edgeId": "e-order_lookup_result-order_history_info-115",
      "source": "order_lookup_result",
      "target": "order_history_info",
      "label": "View order history",
      "sourceHandle": "order_history_info"
    },
    {
      "edgeId": "e-order_lookup_result-collect_info-116",
      "source": "order_lookup_result",
      "target": "collect_info",
      "label": "I need something else",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-package_location-resolved_end-117",
      "source": "package_location",
      "target": "resolved_end",
      "label": "Yes, found it!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-package_location-delayed_package-118",
      "source": "package_location",
      "target": "delayed_package",
      "label": "Package is delayed",
      "sourceHandle": "delayed_package"
    },
    {
      "edgeId": "e-package_location-missing_package-119",
      "source": "package_location",
      "target": "missing_package",
      "label": "Package shows delivered but not received",
      "sourceHandle": "missing_package"
    },
    {
      "edgeId": "e-delayed_package-new_delivery_estimate-120",
      "source": "delayed_package",
      "target": "new_delivery_estimate",
      "label": "Get estimated new delivery date",
      "sourceHandle": "new_delivery_estimate"
    },
    {
      "edgeId": "e-delayed_package-priority_escalation-121",
      "source": "delayed_package",
      "target": "priority_escalation",
      "label": "Request priority handling",
      "sourceHandle": "priority_escalation"
    },
    {
      "edgeId": "e-delayed_package-cancel_refund-122",
      "source": "delayed_package",
      "target": "cancel_refund",
      "label": "Cancel and get refund",
      "sourceHandle": "cancel_refund"
    },
    {
      "edgeId": "e-missing_package-collect_info-123",
      "source": "missing_package",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-change_address-address_change_possible-124",
      "source": "change_address",
      "target": "address_change_possible",
      "label": "Not yet shipped",
      "sourceHandle": "address_change_possible"
    },
    {
      "edgeId": "e-change_address-address_change_shipped-125",
      "source": "change_address",
      "target": "address_change_shipped",
      "label": "Already shipped",
      "sourceHandle": "address_change_shipped"
    },
    {
      "edgeId": "e-change_address-collect_info-126",
      "source": "change_address",
      "target": "collect_info",
      "label": "I'm not sure",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-address_change_possible-resolved_end-127",
      "source": "address_change_possible",
      "target": "resolved_end",
      "label": "Yes, done!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-address_change_possible-collect_info-128",
      "source": "address_change_possible",
      "target": "collect_info",
      "label": "I need help doing it",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-address_change_shipped-collect_info-129",
      "source": "address_change_shipped",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-cancel_order-price_match_offer-130",
      "source": "cancel_order",
      "target": "price_match_offer",
      "label": "Found a better price",
      "sourceHandle": "price_match_offer"
    },
    {
      "edgeId": "e-cancel_order-cancel_confirm-131",
      "source": "cancel_order",
      "target": "cancel_confirm",
      "label": "Ordered by mistake",
      "sourceHandle": "cancel_confirm"
    },
    {
      "edgeId": "e-cancel_order-cancel_confirm-132",
      "source": "cancel_order",
      "target": "cancel_confirm",
      "label": "No longer need it",
      "sourceHandle": "cancel_confirm"
    },
    {
      "edgeId": "e-cancel_order-delayed_package-133",
      "source": "cancel_order",
      "target": "delayed_package",
      "label": "Taking too long",
      "sourceHandle": "delayed_package"
    },
    {
      "edgeId": "e-price_match_offer-collect_info-134",
      "source": "price_match_offer",
      "target": "collect_info",
      "label": "Request price match",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-price_match_offer-cancel_confirm-135",
      "source": "price_match_offer",
      "target": "cancel_confirm",
      "label": "Still want to cancel",
      "sourceHandle": "cancel_confirm"
    },
    {
      "edgeId": "e-cancel_confirm-collect_info-136",
      "source": "cancel_confirm",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-product_menu-product_availability-137",
      "source": "product_menu",
      "target": "product_availability",
      "label": "Check product availability",
      "sourceHandle": "product_availability"
    },
    {
      "edgeId": "e-product_menu-product_specs-138",
      "source": "product_menu",
      "target": "product_specs",
      "label": "Product specifications",
      "sourceHandle": "product_specs"
    },
    {
      "edgeId": "e-product_menu-product_compare-139",
      "source": "product_menu",
      "target": "product_compare",
      "label": "Compare products",
      "sourceHandle": "product_compare"
    },
    {
      "edgeId": "e-product_menu-store_locations-140",
      "source": "product_menu",
      "target": "store_locations",
      "label": "Store locations",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-product_menu-start-141",
      "source": "product_menu",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-product_availability-availability_result-142",
      "source": "product_availability",
      "target": "availability_result",
      "label": "Next"
    },
    {
      "edgeId": "e-availability_result-product_availability-143",
      "source": "availability_result",
      "target": "product_availability",
      "label": "Search again",
      "sourceHandle": "product_availability"
    },
    {
      "edgeId": "e-availability_result-store_locations-144",
      "source": "availability_result",
      "target": "store_locations",
      "label": "Store locations",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-availability_result-start-145",
      "source": "availability_result",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-branch_stock_check-reserve_item-146",
      "source": "branch_stock_check",
      "target": "reserve_item",
      "label": "Reserve this item",
      "sourceHandle": "reserve_item"
    },
    {
      "edgeId": "e-branch_stock_check-store_directions-147",
      "source": "branch_stock_check",
      "target": "store_directions",
      "label": "Get store directions",
      "sourceHandle": "store_directions"
    },
    {
      "edgeId": "e-branch_stock_check-availability_result-148",
      "source": "branch_stock_check",
      "target": "availability_result",
      "label": "Check another branch",
      "sourceHandle": "availability_result"
    },
    {
      "edgeId": "e-branch_stock_check-start-149",
      "source": "branch_stock_check",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-online_stock_check-resolved_end-150",
      "source": "online_stock_check",
      "target": "resolved_end",
      "label": "Yes, thanks!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-online_stock_check-collect_info-151",
      "source": "online_stock_check",
      "target": "collect_info",
      "label": "Need help ordering",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-product_specs-resolved_end-152",
      "source": "product_specs",
      "target": "resolved_end",
      "label": "No, that helps",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-product_specs-collect_info-153",
      "source": "product_specs",
      "target": "collect_info",
      "label": "Yes, talk to product expert",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-store_locations-store_ablekuma-154",
      "source": "store_locations",
      "target": "store_ablekuma",
      "label": "Ablekuma",
      "sourceHandle": "store_ablekuma"
    },
    {
      "edgeId": "e-store_locations-store_weija-155",
      "source": "store_locations",
      "target": "store_weija",
      "label": "Weija",
      "sourceHandle": "store_weija"
    },
    {
      "edgeId": "e-store_locations-store_accra-156",
      "source": "store_locations",
      "target": "store_accra",
      "label": "Accra Central",
      "sourceHandle": "store_accra"
    },
    {
      "edgeId": "e-store_locations-store_patasi-157",
      "source": "store_locations",
      "target": "store_patasi",
      "label": "Patasi (Kumasi)",
      "sourceHandle": "store_patasi"
    },
    {
      "edgeId": "e-store_locations-store_techiman-158",
      "source": "store_locations",
      "target": "store_techiman",
      "label": "Techiman",
      "sourceHandle": "store_techiman"
    },
    {
      "edgeId": "e-store_ablekuma-store_directions-159",
      "source": "store_ablekuma",
      "target": "store_directions",
      "label": "Get directions",
      "sourceHandle": "store_directions"
    },
    {
      "edgeId": "e-store_ablekuma-product_availability-160",
      "source": "store_ablekuma",
      "target": "product_availability",
      "label": "Check product stock",
      "sourceHandle": "product_availability"
    },
    {
      "edgeId": "e-store_ablekuma-store_locations-161",
      "source": "store_ablekuma",
      "target": "store_locations",
      "label": "Back to locations",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-store_weija-store_directions-162",
      "source": "store_weija",
      "target": "store_directions",
      "label": "Get directions",
      "sourceHandle": "store_directions"
    },
    {
      "edgeId": "e-store_weija-product_availability-163",
      "source": "store_weija",
      "target": "product_availability",
      "label": "Check product stock",
      "sourceHandle": "product_availability"
    },
    {
      "edgeId": "e-store_weija-store_locations-164",
      "source": "store_weija",
      "target": "store_locations",
      "label": "Back to locations",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-store_accra-store_directions-165",
      "source": "store_accra",
      "target": "store_directions",
      "label": "Get directions",
      "sourceHandle": "store_directions"
    },
    {
      "edgeId": "e-store_accra-product_availability-166",
      "source": "store_accra",
      "target": "product_availability",
      "label": "Check product stock",
      "sourceHandle": "product_availability"
    },
    {
      "edgeId": "e-store_accra-store_locations-167",
      "source": "store_accra",
      "target": "store_locations",
      "label": "Back to locations",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-store_patasi-store_directions-168",
      "source": "store_patasi",
      "target": "store_directions",
      "label": "Get directions",
      "sourceHandle": "store_directions"
    },
    {
      "edgeId": "e-store_patasi-product_availability-169",
      "source": "store_patasi",
      "target": "product_availability",
      "label": "Check product stock",
      "sourceHandle": "product_availability"
    },
    {
      "edgeId": "e-store_patasi-store_locations-170",
      "source": "store_patasi",
      "target": "store_locations",
      "label": "Back to locations",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-store_techiman-store_directions-171",
      "source": "store_techiman",
      "target": "store_directions",
      "label": "Get directions",
      "sourceHandle": "store_directions"
    },
    {
      "edgeId": "e-store_techiman-product_availability-172",
      "source": "store_techiman",
      "target": "product_availability",
      "label": "Check product stock",
      "sourceHandle": "product_availability"
    },
    {
      "edgeId": "e-store_techiman-store_locations-173",
      "source": "store_techiman",
      "target": "store_locations",
      "label": "Back to locations",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-returns_menu-faulty_product-174",
      "source": "returns_menu",
      "target": "faulty_product",
      "label": "Product is faulty/defective",
      "sourceHandle": "faulty_product"
    },
    {
      "edgeId": "e-returns_menu-wrong_item-175",
      "source": "returns_menu",
      "target": "wrong_item",
      "label": "Wrong item received",
      "sourceHandle": "wrong_item"
    },
    {
      "edgeId": "e-returns_menu-change_of_mind-176",
      "source": "returns_menu",
      "target": "change_of_mind",
      "label": "Changed my mind",
      "sourceHandle": "change_of_mind"
    },
    {
      "edgeId": "e-returns_menu-refund_status-177",
      "source": "returns_menu",
      "target": "refund_status",
      "label": "Check refund status",
      "sourceHandle": "refund_status"
    },
    {
      "edgeId": "e-returns_menu-start-178",
      "source": "returns_menu",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-faulty_product-return_7days-179",
      "source": "faulty_product",
      "target": "return_7days",
      "label": "Within 7 days",
      "sourceHandle": "return_7days"
    },
    {
      "edgeId": "e-faulty_product-return_30days-180",
      "source": "faulty_product",
      "target": "return_30days",
      "label": "7-30 days ago",
      "sourceHandle": "return_30days"
    },
    {
      "edgeId": "e-faulty_product-warranty_check-181",
      "source": "faulty_product",
      "target": "warranty_check",
      "label": "Over 30 days ago",
      "sourceHandle": "warranty_check"
    },
    {
      "edgeId": "e-return_7days-schedule_pickup-182",
      "source": "return_7days",
      "target": "schedule_pickup",
      "label": "Schedule pickup",
      "sourceHandle": "schedule_pickup"
    },
    {
      "edgeId": "e-return_7days-store_locations-183",
      "source": "return_7days",
      "target": "store_locations",
      "label": "I'll visit a store",
      "sourceHandle": "store_locations"
    },
    {
      "edgeId": "e-return_7days-collect_info-184",
      "source": "return_7days",
      "target": "collect_info",
      "label": "Need more help",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-return_30days-schedule_pickup-185",
      "source": "return_30days",
      "target": "schedule_pickup",
      "label": "Yes, exchange it",
      "sourceHandle": "schedule_pickup"
    },
    {
      "edgeId": "e-return_30days-refund_request-186",
      "source": "return_30days",
      "target": "refund_request",
      "label": "I'd prefer a refund",
      "sourceHandle": "refund_request"
    },
    {
      "edgeId": "e-warranty_check-warranty_claim-187",
      "source": "warranty_check",
      "target": "warranty_claim",
      "label": "Yes, I have it",
      "sourceHandle": "warranty_claim"
    },
    {
      "edgeId": "e-warranty_check-find_purchase_record-188",
      "source": "warranty_check",
      "target": "find_purchase_record",
      "label": "No, I lost it",
      "sourceHandle": "find_purchase_record"
    },
    {
      "edgeId": "e-warranty_claim-collect_info-189",
      "source": "warranty_claim",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-wrong_item-collect_info-190",
      "source": "wrong_item",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-change_of_mind-schedule_pickup-191",
      "source": "change_of_mind",
      "target": "schedule_pickup",
      "label": "Yes, start return",
      "sourceHandle": "schedule_pickup"
    },
    {
      "edgeId": "e-change_of_mind-collect_info-192",
      "source": "change_of_mind",
      "target": "collect_info",
      "label": "Not sure",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-change_of_mind-resolved_end-193",
      "source": "change_of_mind",
      "target": "resolved_end",
      "label": "No, it's excluded",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-refund_status-refund_status_result-194",
      "source": "refund_status",
      "target": "refund_status_result",
      "label": "Next"
    },
    {
      "edgeId": "e-refund_status_result-refund_delay-195",
      "source": "refund_status_result",
      "target": "refund_delay",
      "label": "This is taking too long",
      "sourceHandle": "refund_delay"
    },
    {
      "edgeId": "e-refund_status_result-resolved_end-196",
      "source": "refund_status_result",
      "target": "resolved_end",
      "label": "Got it, thanks!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-refund_delay-collect_info-197",
      "source": "refund_delay",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-schedule_pickup-collect_info-198",
      "source": "schedule_pickup",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_menu-complaint_service-199",
      "source": "complaint_menu",
      "target": "complaint_service",
      "label": "Poor customer service",
      "sourceHandle": "complaint_service"
    },
    {
      "edgeId": "e-complaint_menu-complaint_product-200",
      "source": "complaint_menu",
      "target": "complaint_product",
      "label": "Product quality issue",
      "sourceHandle": "complaint_product"
    },
    {
      "edgeId": "e-complaint_menu-complaint_delivery-201",
      "source": "complaint_menu",
      "target": "complaint_delivery",
      "label": "Delivery problem",
      "sourceHandle": "complaint_delivery"
    },
    {
      "edgeId": "e-complaint_menu-complaint_staff-202",
      "source": "complaint_menu",
      "target": "complaint_staff",
      "label": "Staff behavior",
      "sourceHandle": "complaint_staff"
    },
    {
      "edgeId": "e-complaint_menu-complaint_store-203",
      "source": "complaint_menu",
      "target": "complaint_store",
      "label": "Store experience",
      "sourceHandle": "complaint_store"
    },
    {
      "edgeId": "e-complaint_menu-complaint_other-204",
      "source": "complaint_menu",
      "target": "complaint_other",
      "label": "Other complaint",
      "sourceHandle": "complaint_other"
    },
    {
      "edgeId": "e-complaint_service-complaint_wait_time-205",
      "source": "complaint_service",
      "target": "complaint_wait_time",
      "label": "Long wait times",
      "sourceHandle": "complaint_wait_time"
    },
    {
      "edgeId": "e-complaint_service-complaint_unhelpful-206",
      "source": "complaint_service",
      "target": "complaint_unhelpful",
      "label": "Unhelpful response",
      "sourceHandle": "complaint_unhelpful"
    },
    {
      "edgeId": "e-complaint_service-complaint_unresolved-207",
      "source": "complaint_service",
      "target": "complaint_unresolved",
      "label": "Issue not resolved",
      "sourceHandle": "complaint_unresolved"
    },
    {
      "edgeId": "e-complaint_service-complaint_staff-208",
      "source": "complaint_service",
      "target": "complaint_staff",
      "label": "Rude interaction",
      "sourceHandle": "complaint_staff"
    },
    {
      "edgeId": "e-complaint_service-complaint_menu-209",
      "source": "complaint_service",
      "target": "complaint_menu",
      "label": "Back to complaints",
      "sourceHandle": "complaint_menu"
    },
    {
      "edgeId": "e-complaint_wait_time-complaint_details-210",
      "source": "complaint_wait_time",
      "target": "complaint_details",
      "label": "Phone support",
      "sourceHandle": "complaint_details"
    },
    {
      "edgeId": "e-complaint_wait_time-complaint_store_location-211",
      "source": "complaint_wait_time",
      "target": "complaint_store_location",
      "label": "In-store",
      "sourceHandle": "complaint_store_location"
    },
    {
      "edgeId": "e-complaint_wait_time-complaint_details-212",
      "source": "complaint_wait_time",
      "target": "complaint_details",
      "label": "Online chat",
      "sourceHandle": "complaint_details"
    },
    {
      "edgeId": "e-complaint_wait_time-complaint_delivery-213",
      "source": "complaint_wait_time",
      "target": "complaint_delivery",
      "label": "Delivery wait",
      "sourceHandle": "complaint_delivery"
    },
    {
      "edgeId": "e-complaint_unhelpful-complaint_details-214",
      "source": "complaint_unhelpful",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_unresolved-complaint_unresolved_escalate-215",
      "source": "complaint_unresolved",
      "target": "complaint_unresolved_escalate",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_unresolved_escalate-complaint_details-216",
      "source": "complaint_unresolved_escalate",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_product-complaint_mismatch-217",
      "source": "complaint_product",
      "target": "complaint_mismatch",
      "label": "Product doesn't match description",
      "sourceHandle": "complaint_mismatch"
    },
    {
      "edgeId": "e-complaint_product-complaint_durability-218",
      "source": "complaint_product",
      "target": "complaint_durability",
      "label": "Product broke quickly",
      "sourceHandle": "complaint_durability"
    },
    {
      "edgeId": "e-complaint_product-complaint_quality-219",
      "source": "complaint_product",
      "target": "complaint_quality",
      "label": "Poor quality materials",
      "sourceHandle": "complaint_quality"
    },
    {
      "edgeId": "e-complaint_product-complaint_missing_parts-220",
      "source": "complaint_product",
      "target": "complaint_missing_parts",
      "label": "Missing parts/accessories",
      "sourceHandle": "complaint_missing_parts"
    },
    {
      "edgeId": "e-complaint_product-complaint_counterfeit-221",
      "source": "complaint_product",
      "target": "complaint_counterfeit",
      "label": "Counterfeit/fake product",
      "sourceHandle": "complaint_counterfeit"
    },
    {
      "edgeId": "e-complaint_mismatch-complaint_details-222",
      "source": "complaint_mismatch",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_durability-complaint_immediate_defect-223",
      "source": "complaint_durability",
      "target": "complaint_immediate_defect",
      "label": "Less than a week",
      "sourceHandle": "complaint_immediate_defect"
    },
    {
      "edgeId": "e-complaint_durability-complaint_early_failure-224",
      "source": "complaint_durability",
      "target": "complaint_early_failure",
      "label": "1-4 weeks",
      "sourceHandle": "complaint_early_failure"
    },
    {
      "edgeId": "e-complaint_durability-warranty_check-225",
      "source": "complaint_durability",
      "target": "warranty_check",
      "label": "1-3 months",
      "sourceHandle": "warranty_check"
    },
    {
      "edgeId": "e-complaint_durability-warranty_check-226",
      "source": "complaint_durability",
      "target": "warranty_check",
      "label": "Over 3 months",
      "sourceHandle": "warranty_check"
    },
    {
      "edgeId": "e-complaint_immediate_defect-complaint_details-227",
      "source": "complaint_immediate_defect",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_early_failure-complaint_details-228",
      "source": "complaint_early_failure",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_quality-complaint_details-229",
      "source": "complaint_quality",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_missing_parts-complaint_details-230",
      "source": "complaint_missing_parts",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_counterfeit-complaint_details-231",
      "source": "complaint_counterfeit",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_delivery-complaint_late_delivery-232",
      "source": "complaint_delivery",
      "target": "complaint_late_delivery",
      "label": "Very late delivery",
      "sourceHandle": "complaint_late_delivery"
    },
    {
      "edgeId": "e-complaint_delivery-complaint_damaged-233",
      "source": "complaint_delivery",
      "target": "complaint_damaged",
      "label": "Package damaged",
      "sourceHandle": "complaint_damaged"
    },
    {
      "edgeId": "e-complaint_delivery-complaint_wrong_address-234",
      "source": "complaint_delivery",
      "target": "complaint_wrong_address",
      "label": "Wrong address delivered",
      "sourceHandle": "complaint_wrong_address"
    },
    {
      "edgeId": "e-complaint_delivery-complaint_delivery_staff-235",
      "source": "complaint_delivery",
      "target": "complaint_delivery_staff",
      "label": "Rude delivery person",
      "sourceHandle": "complaint_delivery_staff"
    },
    {
      "edgeId": "e-complaint_delivery-missing_package-236",
      "source": "complaint_delivery",
      "target": "missing_package",
      "label": "Package never arrived",
      "sourceHandle": "missing_package"
    },
    {
      "edgeId": "e-complaint_late_delivery-complaint_late_escalate-237",
      "source": "complaint_late_delivery",
      "target": "complaint_late_escalate",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_late_escalate-complaint_details-238",
      "source": "complaint_late_escalate",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_damaged-complaint_details-239",
      "source": "complaint_damaged",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_wrong_address-complaint_details-240",
      "source": "complaint_wrong_address",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_delivery_staff-complaint_details-241",
      "source": "complaint_delivery_staff",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_staff-complaint_staff_details-242",
      "source": "complaint_staff",
      "target": "complaint_staff_details",
      "label": "Ablekuma branch",
      "sourceHandle": "complaint_staff_details"
    },
    {
      "edgeId": "e-complaint_staff-complaint_staff_details-243",
      "source": "complaint_staff",
      "target": "complaint_staff_details",
      "label": "Weija branch",
      "sourceHandle": "complaint_staff_details"
    },
    {
      "edgeId": "e-complaint_staff-complaint_staff_details-244",
      "source": "complaint_staff",
      "target": "complaint_staff_details",
      "label": "Accra branch",
      "sourceHandle": "complaint_staff_details"
    },
    {
      "edgeId": "e-complaint_staff-complaint_staff_details-245",
      "source": "complaint_staff",
      "target": "complaint_staff_details",
      "label": "Patasi branch",
      "sourceHandle": "complaint_staff_details"
    },
    {
      "edgeId": "e-complaint_staff-complaint_staff_details-246",
      "source": "complaint_staff",
      "target": "complaint_staff_details",
      "label": "Techiman branch",
      "sourceHandle": "complaint_staff_details"
    },
    {
      "edgeId": "e-complaint_staff-complaint_staff_details-247",
      "source": "complaint_staff",
      "target": "complaint_staff_details",
      "label": "Phone/Online support",
      "sourceHandle": "complaint_staff_details"
    },
    {
      "edgeId": "e-complaint_staff_details-complaint_staff_escalate-248",
      "source": "complaint_staff_details",
      "target": "complaint_staff_escalate",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_staff_escalate-complaint_details-249",
      "source": "complaint_staff_escalate",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_store-complaint_store_condition-250",
      "source": "complaint_store",
      "target": "complaint_store_condition",
      "label": "Store was dirty/messy",
      "sourceHandle": "complaint_store_condition"
    },
    {
      "edgeId": "e-complaint_store-complaint_store_queues-251",
      "source": "complaint_store",
      "target": "complaint_store_queues",
      "label": "Long checkout queues",
      "sourceHandle": "complaint_store_queues"
    },
    {
      "edgeId": "e-complaint_store-complaint_store_stock-252",
      "source": "complaint_store",
      "target": "complaint_store_stock",
      "label": "Items out of stock",
      "sourceHandle": "complaint_store_stock"
    },
    {
      "edgeId": "e-complaint_store-complaint_store_pricing-253",
      "source": "complaint_store",
      "target": "complaint_store_pricing",
      "label": "Pricing issues",
      "sourceHandle": "complaint_store_pricing"
    },
    {
      "edgeId": "e-complaint_store-complaint_store_safety-254",
      "source": "complaint_store",
      "target": "complaint_store_safety",
      "label": "Safety concern",
      "sourceHandle": "complaint_store_safety"
    },
    {
      "edgeId": "e-complaint_store_condition-complaint_store_location-255",
      "source": "complaint_store_condition",
      "target": "complaint_store_location",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_store_queues-complaint_store_location-256",
      "source": "complaint_store_queues",
      "target": "complaint_store_location",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_store_stock-complaint_stock_escalate-257",
      "source": "complaint_store_stock",
      "target": "complaint_stock_escalate",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_stock_escalate-complaint_store_location-258",
      "source": "complaint_stock_escalate",
      "target": "complaint_store_location",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_store_pricing-complaint_overcharged-259",
      "source": "complaint_store_pricing",
      "target": "complaint_overcharged",
      "label": "Charged wrong price",
      "sourceHandle": "complaint_overcharged"
    },
    {
      "edgeId": "e-complaint_store_pricing-complaint_price_mismatch-260",
      "source": "complaint_store_pricing",
      "target": "complaint_price_mismatch",
      "label": "Price different from tag",
      "sourceHandle": "complaint_price_mismatch"
    },
    {
      "edgeId": "e-complaint_store_pricing-complaint_promo_issue-261",
      "source": "complaint_store_pricing",
      "target": "complaint_promo_issue",
      "label": "Promotion not applied",
      "sourceHandle": "complaint_promo_issue"
    },
    {
      "edgeId": "e-complaint_overcharged-complaint_details-262",
      "source": "complaint_overcharged",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_price_mismatch-complaint_details-263",
      "source": "complaint_price_mismatch",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_promo_issue-complaint_details-264",
      "source": "complaint_promo_issue",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_store_safety-complaint_store_location-265",
      "source": "complaint_store_safety",
      "target": "complaint_store_location",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_store_location-complaint_details-266",
      "source": "complaint_store_location",
      "target": "complaint_details",
      "label": "Ablekuma",
      "sourceHandle": "complaint_details"
    },
    {
      "edgeId": "e-complaint_store_location-complaint_details-267",
      "source": "complaint_store_location",
      "target": "complaint_details",
      "label": "Weija",
      "sourceHandle": "complaint_details"
    },
    {
      "edgeId": "e-complaint_store_location-complaint_details-268",
      "source": "complaint_store_location",
      "target": "complaint_details",
      "label": "Accra Central",
      "sourceHandle": "complaint_details"
    },
    {
      "edgeId": "e-complaint_store_location-complaint_details-269",
      "source": "complaint_store_location",
      "target": "complaint_details",
      "label": "Patasi (Kumasi)",
      "sourceHandle": "complaint_details"
    },
    {
      "edgeId": "e-complaint_store_location-complaint_details-270",
      "source": "complaint_store_location",
      "target": "complaint_details",
      "label": "Techiman",
      "sourceHandle": "complaint_details"
    },
    {
      "edgeId": "e-complaint_other-complaint_details-271",
      "source": "complaint_other",
      "target": "complaint_details",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_details-complaint_contact-272",
      "source": "complaint_details",
      "target": "complaint_contact",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_contact-complaint_description-273",
      "source": "complaint_contact",
      "target": "complaint_description",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_description-complaint_resolution-274",
      "source": "complaint_description",
      "target": "complaint_resolution",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_resolution-complaint_wants_refund-275",
      "source": "complaint_resolution",
      "target": "complaint_wants_refund",
      "label": "Full refund",
      "sourceHandle": "complaint_wants_refund"
    },
    {
      "edgeId": "e-complaint_resolution-complaint_wants_replacement-276",
      "source": "complaint_resolution",
      "target": "complaint_wants_replacement",
      "label": "Replacement product",
      "sourceHandle": "complaint_wants_replacement"
    },
    {
      "edgeId": "e-complaint_resolution-complaint_wants_credit-277",
      "source": "complaint_resolution",
      "target": "complaint_wants_credit",
      "label": "Store credit/compensation",
      "sourceHandle": "complaint_wants_credit"
    },
    {
      "edgeId": "e-complaint_resolution-complaint_wants_acknowledgment-278",
      "source": "complaint_resolution",
      "target": "complaint_wants_acknowledgment",
      "label": "Just want it fixed/acknowledged",
      "sourceHandle": "complaint_wants_acknowledgment"
    },
    {
      "edgeId": "e-complaint_resolution-complaint_wants_manager-279",
      "source": "complaint_resolution",
      "target": "complaint_wants_manager",
      "label": "Speak to manager",
      "sourceHandle": "complaint_wants_manager"
    },
    {
      "edgeId": "e-complaint_wants_refund-complaint_submit-280",
      "source": "complaint_wants_refund",
      "target": "complaint_submit",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_wants_replacement-complaint_submit-281",
      "source": "complaint_wants_replacement",
      "target": "complaint_submit",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_wants_credit-complaint_submit-282",
      "source": "complaint_wants_credit",
      "target": "complaint_submit",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_wants_acknowledgment-complaint_submit-283",
      "source": "complaint_wants_acknowledgment",
      "target": "complaint_submit",
      "label": "Next"
    },
    {
      "edgeId": "e-complaint_wants_manager-complaint_submit-284",
      "source": "complaint_wants_manager",
      "target": "complaint_submit",
      "label": "Next"
    },
    {
      "edgeId": "e-account_menu-password_reset-285",
      "source": "account_menu",
      "target": "password_reset",
      "label": "Reset password",
      "sourceHandle": "password_reset"
    },
    {
      "edgeId": "e-account_menu-update_details-286",
      "source": "account_menu",
      "target": "update_details",
      "label": "Update my details",
      "sourceHandle": "update_details"
    },
    {
      "edgeId": "e-account_menu-payment_issues-287",
      "source": "account_menu",
      "target": "payment_issues",
      "label": "Payment issues",
      "sourceHandle": "payment_issues"
    },
    {
      "edgeId": "e-account_menu-loyalty_points-288",
      "source": "account_menu",
      "target": "loyalty_points",
      "label": "Loyalty points",
      "sourceHandle": "loyalty_points"
    },
    {
      "edgeId": "e-account_menu-start-289",
      "source": "account_menu",
      "target": "main_menu",
      "label": "Back to Main Menu",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-password_reset-resolved_end-290",
      "source": "password_reset",
      "target": "resolved_end",
      "label": "Yes, all good!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-password_reset-email_not_received-291",
      "source": "password_reset",
      "target": "email_not_received",
      "label": "Didn't receive email",
      "sourceHandle": "email_not_received"
    },
    {
      "edgeId": "e-email_not_received-collect_info-292",
      "source": "email_not_received",
      "target": "collect_info",
      "label": "Email might be wrong",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-email_not_received-password_reset-293",
      "source": "email_not_received",
      "target": "password_reset",
      "label": "Try again with different email",
      "sourceHandle": "password_reset"
    },
    {
      "edgeId": "e-update_details-resolved_end-294",
      "source": "update_details",
      "target": "resolved_end",
      "label": "Yes, thanks!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-update_details-password_reset-295",
      "source": "update_details",
      "target": "password_reset",
      "label": "I can't log in",
      "sourceHandle": "password_reset"
    },
    {
      "edgeId": "e-update_details-collect_info-296",
      "source": "update_details",
      "target": "collect_info",
      "label": "Need help",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-payment_issues-payment_failed-297",
      "source": "payment_issues",
      "target": "payment_failed",
      "label": "Payment failed",
      "sourceHandle": "payment_failed"
    },
    {
      "edgeId": "e-payment_issues-double_charge-298",
      "source": "payment_issues",
      "target": "double_charge",
      "label": "Charged twice",
      "sourceHandle": "double_charge"
    },
    {
      "edgeId": "e-payment_issues-momo_pending-299",
      "source": "payment_issues",
      "target": "momo_pending",
      "label": "Mobile money not confirmed",
      "sourceHandle": "momo_pending"
    },
    {
      "edgeId": "e-payment_issues-need_receipt-300",
      "source": "payment_issues",
      "target": "need_receipt",
      "label": "Need invoice/receipt",
      "sourceHandle": "need_receipt"
    },
    {
      "edgeId": "e-payment_failed-resolved_end-301",
      "source": "payment_failed",
      "target": "resolved_end",
      "label": "Try again",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-payment_failed-collect_info-302",
      "source": "payment_failed",
      "target": "collect_info",
      "label": "Payment keeps failing",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-double_charge-collect_info-303",
      "source": "double_charge",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-momo_pending-resolved_end-304",
      "source": "momo_pending",
      "target": "resolved_end",
      "label": "Yes, it went through",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-momo_pending-collect_info-305",
      "source": "momo_pending",
      "target": "collect_info",
      "label": "Still pending after 15 mins",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-need_receipt-resolved_end-306",
      "source": "need_receipt",
      "target": "resolved_end",
      "label": "Yes, got it",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-need_receipt-find_order-307",
      "source": "need_receipt",
      "target": "find_order",
      "label": "Can't find my order",
      "sourceHandle": "find_order"
    },
    {
      "edgeId": "e-loyalty_points-redeem_points-308",
      "source": "loyalty_points",
      "target": "redeem_points",
      "label": "How to redeem",
      "sourceHandle": "redeem_points"
    },
    {
      "edgeId": "e-loyalty_points-missing_points-309",
      "source": "loyalty_points",
      "target": "missing_points",
      "label": "Points not credited",
      "sourceHandle": "missing_points"
    },
    {
      "edgeId": "e-loyalty_points-resolved_end-310",
      "source": "loyalty_points",
      "target": "resolved_end",
      "label": "That's all, thanks",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-redeem_points-resolved_end-311",
      "source": "redeem_points",
      "target": "resolved_end",
      "label": "No, thanks!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-redeem_points-collect_info-312",
      "source": "redeem_points",
      "target": "collect_info",
      "label": "Yes, talk to agent",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-missing_points-collect_info-313",
      "source": "missing_points",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-collect_info-collect_phone-314",
      "source": "collect_info",
      "target": "collect_phone",
      "label": "Next"
    },
    {
      "edgeId": "e-collect_phone-collect_issue-315",
      "source": "collect_phone",
      "target": "collect_issue",
      "label": "Next"
    },
    {
      "edgeId": "e-collect_issue-transcript_offer-316",
      "source": "collect_issue",
      "target": "transcript_offer",
      "label": "Next"
    },
    {
      "edgeId": "e-transcript_offer-collect_email-317",
      "source": "transcript_offer",
      "target": "collect_email",
      "label": "Yes please",
      "sourceHandle": "collect_email"
    },
    {
      "edgeId": "e-transcript_offer-agent_queue-318",
      "source": "transcript_offer",
      "target": "agent_queue",
      "label": "No thanks",
      "sourceHandle": "agent_queue"
    },
    {
      "edgeId": "e-collect_email-agent_queue-319",
      "source": "collect_email",
      "target": "agent_queue",
      "label": "Next"
    },
    {
      "edgeId": "e-resolved_end-start-320",
      "source": "resolved_end",
      "target": "main_menu",
      "label": "Yes, another question",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-resolved_end-resolution_check-321",
      "source": "resolved_end",
      "target": "resolution_check",
      "label": "No, that's all",
      "sourceHandle": "resolution_check"
    },
    {
      "edgeId": "e-resolution_check-resolution_fast-322",
      "source": "resolution_check",
      "target": "resolution_fast",
      "label": "Resolved in one go",
      "sourceHandle": "resolution_fast"
    },
    {
      "edgeId": "e-resolution_check-resolution_steps-323",
      "source": "resolution_check",
      "target": "resolution_steps",
      "label": "Resolved after a few steps",
      "sourceHandle": "resolution_steps"
    },
    {
      "edgeId": "e-resolution_check-resolution_open-324",
      "source": "resolution_check",
      "target": "resolution_open",
      "label": "Not resolved yet",
      "sourceHandle": "resolution_open"
    },
    {
      "edgeId": "e-resolution_check-resolution_open-325",
      "source": "resolution_check",
      "target": "resolution_open",
      "label": "Still open after multiple tries",
      "sourceHandle": "resolution_open"
    },
    {
      "edgeId": "e-resolution_fast-resolution_followup-326",
      "source": "resolution_fast",
      "target": "resolution_followup",
      "label": "Next"
    },
    {
      "edgeId": "e-resolution_steps-resolution_followup-327",
      "source": "resolution_steps",
      "target": "resolution_followup",
      "label": "Next"
    },
    {
      "edgeId": "e-resolution_open-resolution_followup-328",
      "source": "resolution_open",
      "target": "resolution_followup",
      "label": "Next"
    },
    {
      "edgeId": "e-resolution_followup-survey_q1-329",
      "source": "resolution_followup",
      "target": "survey_q1",
      "label": "Yes, rate my chat",
      "sourceHandle": "survey_q1"
    },
    {
      "edgeId": "e-resolution_followup-end_prompt-330",
      "source": "resolution_followup",
      "target": "end_prompt",
      "label": "Skip to end",
      "sourceHandle": "end_prompt"
    },
    {
      "edgeId": "e-survey_start-survey_q1-331",
      "source": "survey_start",
      "target": "survey_q1",
      "label": "Next"
    },
    {
      "edgeId": "e-survey_q1-survey_q2-332",
      "source": "survey_q1",
      "target": "survey_q2",
      "label": "Next"
    },
    {
      "edgeId": "e-survey_q2-survey_complete-333",
      "source": "survey_q2",
      "target": "survey_complete",
      "label": "Next"
    },
    {
      "edgeId": "e-store_directions-resolved_end-334",
      "source": "store_directions",
      "target": "resolved_end",
      "label": "No, thanks!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-store_directions-start-335",
      "source": "store_directions",
      "target": "main_menu",
      "label": "Yes, more help",
      "sourceHandle": "start"
    },
    {
      "edgeId": "e-reserve_item-collect_info-336",
      "source": "reserve_item",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-all_stock_check-online_stock_check-337",
      "source": "all_stock_check",
      "target": "online_stock_check",
      "label": "Fastest delivery",
      "sourceHandle": "online_stock_check"
    },
    {
      "edgeId": "e-all_stock_check-availability_result-338",
      "source": "all_stock_check",
      "target": "availability_result",
      "label": "Pickup today",
      "sourceHandle": "availability_result"
    },
    {
      "edgeId": "e-all_stock_check-collect_info-339",
      "source": "all_stock_check",
      "target": "collect_info",
      "label": "Talk to sales team",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-product_compare-resolved_end-340",
      "source": "product_compare",
      "target": "resolved_end",
      "label": "No, I'll use the tool",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-product_compare-collect_info-341",
      "source": "product_compare",
      "target": "collect_info",
      "label": "Yes, talk to expert",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-find_purchase_record-warranty_claim-342",
      "source": "find_purchase_record",
      "target": "warranty_claim",
      "label": "Next"
    },
    {
      "edgeId": "e-new_delivery_estimate-collect_info-343",
      "source": "new_delivery_estimate",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-priority_escalation-collect_info-344",
      "source": "priority_escalation",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-cancel_refund-collect_info-345",
      "source": "cancel_refund",
      "target": "collect_info",
      "label": "Next"
    },
    {
      "edgeId": "e-order_history_info-resolved_end-346",
      "source": "order_history_info",
      "target": "resolved_end",
      "label": "Yes, thanks!",
      "sourceHandle": "resolved_end"
    },
    {
      "edgeId": "e-order_history_info-password_reset-347",
      "source": "order_history_info",
      "target": "password_reset",
      "label": "Can't log in",
      "sourceHandle": "password_reset"
    },
    {
      "edgeId": "e-order_history_info-collect_info-348",
      "source": "order_history_info",
      "target": "collect_info",
      "label": "Need more help",
      "sourceHandle": "collect_info"
    },
    {
      "edgeId": "e-refund_request-collect_info-349",
      "source": "refund_request",
      "target": "collect_info",
      "label": "Next"
    }
  ],
  "variables": [
    {
      "name": "order_product_query",
      "type": "string"
    },
    {
      "name": "pregnancy_product_query",
      "type": "string"
    },
    {
      "name": "order_number",
      "type": "string"
    },
    {
      "name": "customer_email",
      "type": "string"
    },
    {
      "name": "product_name",
      "type": "string"
    },
    {
      "name": "refund_reference",
      "type": "string"
    },
    {
      "name": "previous_case",
      "type": "string"
    },
    {
      "name": "days_late",
      "type": "string"
    },
    {
      "name": "incident_date",
      "type": "string"
    },
    {
      "name": "wanted_product",
      "type": "string"
    },
    {
      "name": "customer_name",
      "type": "string"
    },
    {
      "name": "customer_phone",
      "type": "string"
    },
    {
      "name": "complaint_description",
      "type": "string"
    },
    {
      "name": "issue_description",
      "type": "string"
    },
    {
      "name": "transcript_email",
      "type": "string"
    },
    {
      "name": "customer_contact",
      "type": "string"
    }
  ]
};

export function getAmalenaPluginTemplate(): WorkflowTemplate {
  return AMALENA_PLUGIN_TEMPLATE;
}
