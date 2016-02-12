var app = angular.module("securityApp", ["ngRoute"]);

app.config(["$routeProvider",function ($routeProvider) {
    $routeProvider.when("/", {
        templateUrl: "templates/home.html",
        controller: "HomeController",
        resolve: {
            auth: function ($q, authenticationSvc) {
                var userInfo = authenticationSvc.getUserInfo();
                if (userInfo) {
                    return $q.when(userInfo);
                } else {
                    return $q.reject({ authenticated: false });
                }
            }
        }
    }).when("/login", {
        templateUrl: "templates/login.html",
        controller: "LoginController"
    }).when("/new-employee", {
        templateUrl: "templates/addEmployee.html",
        controller: "addEmployeeController"
    });
}]);

app.run(["$rootScope", "$location", function ($rootScope, $location) {

    $rootScope.$on("$routeChangeSuccess", function (userInfo) {
        console.log(userInfo);
    });

    $rootScope.$on("$routeChangeError", function (event, current, previous, eventObj) {
        if (eventObj.authenticated === false) {
            $location.path("/login");
        }
    });
}]);

app.factory("authenticationSvc", ["$http","$q","$window",function ($http, $q, $window) {
    var userInfo;

    function login(userName, password) {
        var deferred = $q.defer();

        $http.post("/api/login", { userName: userName, password: password })
            .then(function (result) {
                userInfo = {
                    accessToken: result.data.access_token,
                    userName: result.data.userName
                };
                $window.sessionStorage["userInfo"] = JSON.stringify(userInfo);
                deferred.resolve(userInfo);
            }, function (error) {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    function logout() {
        var deferred = $q.defer();

        $http({
            method: "POST",
            url: "/api/logout",
            headers: {
                "access_token": userInfo.accessToken
            }
        }).then(function (result) {
            userInfo = null;
            $window.sessionStorage["userInfo"] = null;
            deferred.resolve(result);
        }, function (error) {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    function getUserInfo() {
        return userInfo;
    }

    function init() {
        if ($window.sessionStorage["userInfo"]) {
            userInfo = JSON.parse($window.sessionStorage["userInfo"]);
        }
    }
    init();

    return {
        login: login,
        logout: logout,
        getUserInfo: getUserInfo
    };
}]);

app.controller("LoginController", ["$scope", "$location", "$window", "authenticationSvc",function ($scope, $location, $window, authenticationSvc) {
    $scope.userInfo = null;
    $scope.login = function () {
        authenticationSvc.login($scope.userName, $scope.password)
            .then(function (result) {
                $scope.userInfo = result;
                $location.path("/");
            }, function (error) {
                $window.alert("Invalid credentials");
                console.log(error);
            });
    };

    $scope.cancel = function () {
        $scope.userName = "";
        $scope.password = "";
    };
}]);


app.controller("MainController", ["$scope", "$http", function ($scope, $http) {    
    load_demos();
    
    function load_demos(){                
        $http.get("/api/load").success(function(data){
                $scope.loaded_demos = data;
            })                
    }
}]);

app.controller('addEmployeeController', ['$scope', '$http', function ($scope, $http) {

    $scope.saveEmployee = function (){        

        var post = { name: $scope.employeeObj.name, contact: $scope.employeeObj.contact, 
                    email: $scope.employeeObj.email, passport: $scope.employeeObj.passport };

        $http.post("/api/addNew", post).success(function(data){
            $scope.customerObj = data;
        });

     } 
    
}])

app.controller("HomeController", ["$scope", "$location", "authenticationSvc", "auth", "$http",
    function ($scope, $location, authenticationSvc, auth, $http) {
    $scope.userInfo = auth;

    $http.get("/api/load").success(function(data){
         $scope.emp_details = data;
     });  

    $scope.addEmployee = function (){
        $location.path("/new-employee");
    } 


    $scope.logout = function () {
        authenticationSvc.logout()
            .then(function (result) {
                $scope.userInfo = null;
                $location.path("/login");
            }, function (error) {
                console.log(error);
            });
    };
}]);