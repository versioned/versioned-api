// (defn spec [config]
//   (generate-spec
//     (id-spec)
//     (typed-spec)
//     {
//       :type :changelog
//       :schema {
//         :type "object"
//         :properties {
//           :action {:enum ["create" "update" "delete"]}
//           :doc {:type "object"}
//           :changes {:type "object"}
//           :created_by {:type "string" :format "email"}
//           :created_at {:type "string" :format "date-time"}
//         }
//         :additionalProperties false
//         :required [:action :doc :created_by :created_at]
//       }
//       :routes [:list :get]
//     }))

// (s/defn get-user :- (s/maybe Email)
//   [request :- Request]
//   (get-in request [:user :email]))
//
// (s/defn updated-by :- Map
//   [request :- Request]
//   {:updated_by (get-user request)})
//
// (s/defn created-by :- Map
//   [request :- Request]
//   {:created_by (get-user request)})
//
// (s/defn save-changelog :- (s/maybe Changelog)
//   [app :- App, request :- Request, model :- Model, action :- Action, doc :- Map]
//   (let [errors (not-empty (model-errors doc))
//         changes (if (= :update action) (model-changes model doc) nil)
//         user (get-user request)
//         changelog-spec (get-model app :changelog)
//         changelog-doc {
//           :action action
//           :doc doc
//           :changes changes
//           :created_by user
//           :created_at (d/now)}]
//     (if-not errors
//       (model-api/create app changelog-spec changelog-doc))))
